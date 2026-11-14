import { beforeAll, describe, expect, it, vi } from "vitest";
import { isolate, req, staff } from "./p4-helpers";

const E = (o: Record<string, string> = {}) => o as unknown as NodeJS.ProcessEnv;
beforeAll(() => { isolate(); });

describe("flags off: no vendor activity", () => {
  it("every vendor/AR flag defaults OFF and the adapter is Noop", async () => {
    const { flags } = await import("@/lib/p4/flags");
    const f = flags({});
    for (const k of ["datamoon", "datamoonMain", "datamoonIntent", "datamoonTopicSearch", "datamoonActivation", "datamoonCrmSync", "arArkit", "arRoomplan", "arArcore", "hover", "cubicasa"] as const) expect(f[k]).toBe(false);
    expect(flags({ DATAMOON_ENABLED: "1", DATAMOON_INTENT_ENABLED: "yes" }).datamoonIntent).toBe(false); // only literal "true"
    expect(flags({ DATAMOON_INTENT_ENABLED: "true" }).datamoonIntent).toBe(false); // master switch required
    const { getAdapter, NoopDataMoonAdapter } = await import("@/lib/datamoon/adapter");
    expect(getAdapter(E())).toBe(NoopDataMoonAdapter);
    expect(getAdapter(E({ DATAMOON_ENABLED: "true", DATAMOON_INTENT_ENABLED: "true" }))).toBe(NoopDataMoonAdapter); // no key
  });
  it("dmFetch refuses without flag+key and never calls fetch", async () => {
    const { dmFetch } = await import("@/lib/datamoon/client");
    const fetcher = vi.fn();
    for (const fam of ["main_module", "main_legacy", "main_topics", "intent"] as const) await expect(dmFetch(fam, "/x", {}, fetcher as never, E())).rejects.toMatchObject({ code: "disabled" });
    await expect(dmFetch("intent", "/x", {}, fetcher as never, E({ DATAMOON_ENABLED: "true", DATAMOON_INTENT_ENABLED: "true" }))).rejects.toMatchObject({ code: "disabled" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("status is disabled/not connected with no keys; measurement providers all unsupported", async () => {
    const { dmStatus } = await import("@/lib/datamoon/config");
    expect(JSON.stringify(dmStatus(E()))).not.toMatch(/live|connected"/i);
    const { measurementProviders } = await import("@/lib/measure/providers");
    const ps = measurementProviders({});
    expect(ps.map((p) => p.id).sort()).toEqual(["arcore", "arkit", "cubicasa", "hover", "roomplan"]);
    for (const p of ps) {
      expect(p.capability({ platform: "ios", hasLidar: true, arSupported: true, nativeApp: true }).supported).toBe(false);
      await expect(p.createSession("prj_x")).rejects.toThrow();
      expect(p.fallback).toBe("mobile_web_walkthrough");
    }
  });
  it("webhook route is 404 while the intent flag is off", async () => {
    const { POST } = await import("@/app/api/webhooks/datamoon/exports/route");
    expect((await POST(req("/api/webhooks/datamoon/exports", { method: "POST", body: "{}" }))).status).toBe(404);
  });
});

describe("DataMoon auth separation", () => {
  it("main-module uses X-Api-Key header, legacy puts api_key in the body, intent uses X-API-Key", async () => {
    const { buildRequest } = await import("@/lib/datamoon/client");
    const e = E({ DATAMOON_MAIN_MODULE_KEY: "mk", DATAMOON_LEGACY_KEY: "lk", DATAMOON_INTENT_KEY: "ik" });
    const m = buildRequest("main_module", "/m/audiences/build", { body: { a: 1 } }, e);
    expect((m.init.headers as Record<string, string>)["X-Api-Key"]).toBe("mk"); expect(m.init.body).not.toContain("lk");
    const l = buildRequest("main_legacy", "/enrich", { body: { a: 1 } }, e);
    expect(JSON.parse(String(l.init.body)).api_key).toBe("lk"); expect(l.url).not.toContain("api_key");
    expect(JSON.stringify(l.init.headers)).not.toContain("mk");
    const i = buildRequest("intent", "/intent/feeds", {}, e);
    expect((i.init.headers as Record<string, string>)["X-API-Key"]).toBe("ik"); expect(JSON.stringify(i.init.headers)).not.toMatch(/mk|lk/);
    expect(() => buildRequest("intent", "/x", { query: { api_key: "leak" } }, e)).toThrow();
  });
  it("live adapter (with injected fetch) maps 401/429 and never reaches the network in tests", async () => {
    const { liveAdapter } = await import("@/lib/datamoon/adapter");
    const e = E({ DATAMOON_ENABLED: "true", DATAMOON_INTENT_ENABLED: "true", DATAMOON_INTENT_KEY: "ik" });
    const f401 = vi.fn(async () => new Response("bad key", { status: 401 }));
    await expect(liveAdapter(f401 as never, e).getCredits()).rejects.toMatchObject({ code: "unauthorized" });
    const f429 = vi.fn(async () => new Response("slow", { status: 429, headers: { "retry-after": "7" } }));
    await expect(liveAdapter(f429 as never, e).getCredits()).rejects.toMatchObject({ code: "rate_limited", retryAfter: 7 });
  });
});

describe("webhook HMAC", () => {
  const secret = "whsec_test_synthetic";
  it("valid / tampered / expired / missing secret / rotated", async () => {
    const { sign, verifyDataMoonSignature, isUnsignedTest } = await import("@/lib/datamoon/webhook");
    const now = Date.now(); const ts = String(Math.floor(now / 1000)); const raw = '{"id":"e1"}';
    const h = (o: Record<string, string>) => new Headers(o);
    expect(verifyDataMoonSignature(raw, h({ "webhook-timestamp": ts, "webhook-signature": sign(secret, ts, raw) }), secret, now).ok).toBe(true);
    expect(verifyDataMoonSignature(raw + " ", h({ "webhook-timestamp": ts, "webhook-signature": sign(secret, ts, raw) }), secret, now).ok).toBe(false);
    expect(verifyDataMoonSignature(raw, h({ "webhook-timestamp": ts, "webhook-signature": sign("whsec_other", ts, raw) }), secret, now).ok).toBe(false);
    const old = String(Math.floor(now / 1000) - 301);
    expect(verifyDataMoonSignature(raw, h({ "webhook-timestamp": old, "webhook-signature": sign(secret, old, raw) }), secret, now)).toMatchObject({ ok: false, reason: /tolerance/ });
    expect(verifyDataMoonSignature(raw, h({ "webhook-timestamp": ts, "webhook-signature": sign(secret, ts, raw) }), null, now).ok).toBe(false);
    expect(verifyDataMoonSignature(raw, h({ "webhook-timestamp": ts, "webhook-signature": `v1=deadbeef ${sign(secret, ts, raw)}` }), secret, now).ok).toBe(true);
    expect(isUnsignedTest('{"test":true}', h({}))).toBe(true);
    expect(isUnsignedTest('{"test":true}', h({ "webhook-signature": "v1=x" }))).toBe(false);
  });
  it("route: unsigned test acked not ingested; signed → 202 once, then duplicate; bad sig 401; unknown feed 422", async () => {
    const { fixtureWebhookEvent, FIXTURE_FEEDS } = await import("@/lib/datamoon/fixtures");
    const { sign } = await import("@/lib/datamoon/webhook");
    Object.assign(process.env, { DATAMOON_ENABLED: "true", DATAMOON_INTENT_ENABLED: "true", DATAMOON_INTENT_WEBHOOK_SECRET: secret, DATAMOON_FEED_BRAND_MAP: JSON.stringify({ [FIXTURE_FEEDS[0].id]: "portfolioworks" }) });
    const { POST } = await import("@/app/api/webhooks/datamoon/exports/route");
    const send = (raw: string, sig?: string) => { const ts = String(Math.floor(Date.now() / 1000)); return POST(req("/x", { method: "POST", body: raw, headers: sig === undefined ? {} : { "webhook-timestamp": ts, "webhook-signature": sig || sign(secret, ts, raw) } })); };
    const t = await send(JSON.stringify(fixtureWebhookEvent({ test: true })));
    expect(t.status).toBe(200); expect((await t.json()).ingested).toBe(false);
    const raw = JSON.stringify(fixtureWebhookEvent({ id: "evt_syn_1" }));
    expect((await send(raw, "")).status).toBe(202);
    const dup = await send(raw, ""); expect(dup.status).toBe(200); expect((await dup.json()).duplicate).toBe(true);
    expect((await send(raw, "v1=00")).status).toBe(401);
    expect((await send(JSON.stringify(fixtureWebhookEvent({ id: "evt_syn_2", feed_id: "00000000-0000-4000-8000-0000000000ff" })), "")).status).toBe(422);
    const { db } = await import("@/lib/p4/db");
    const stored = JSON.stringify(await db.list("webhook_events", "portfolioworks", {}));
    expect(stored).not.toContain("storage.example"); // signed download URL never stored
    for (const k of ["DATAMOON_ENABLED", "DATAMOON_INTENT_ENABLED", "DATAMOON_INTENT_WEBHOOK_SECRET", "DATAMOON_FEED_BRAND_MAP"]) delete process.env[k];
  });
});

describe("recipes, quota, importer, mock pipeline", () => {
  it("draft recipes validate but are blocked from live activation", async () => {
    const { PW_RECIPES, recipeSchema, activationIssues } = await import("@/lib/datamoon/recipes");
    const { liveActivationBlockers } = await import("@/lib/datamoon/service");
    expect(PW_RECIPES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(PW_RECIPES.map((r) => r.persona)).size).toBeGreaterThan(1);
    for (const r of PW_RECIPES) {
      expect(recipeSchema.safeParse(r).success).toBe(true);
      expect(r.max_records).toBe(0);
      expect(activationIssues(r).length).toBeGreaterThan(0);
      expect(liveActivationBlockers(r, E())).toContain("DATAMOON_AUDIENCE_ACTIVATION_PORTFOLIOWORKS is off");
      expect(JSON.stringify(r)).not.toMatch(/phone|mobile|sms/i);
      expect(r.brand).toBe("portfolioworks");
      expect(r.geography.states).toEqual(["MA"]); // Florida / Maine are not live markets: no recipe targets them
      expect(r.approved_destinations).toEqual(["internal_review_only"]);
      expect(r.topics.every((t) => t.source === "hypothesis" && t.id === null)).toBe(true);
    }
    // spec 04: the four landlord / investor / B2B segments
    expect(PW_RECIPES.map((r) => r.persona).sort()).toEqual(["condo_multifamily_association", "property_asset_manager", "small_multiunit_owner", "value_add_investor"]);
    expect(PW_RECIPES.filter((r) => r.audience_type === "b2b").length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(PW_RECIPES)).not.toMatch(/\b(FL|ME|florida|maine)\b/i);
  });
  it("quota guard blocks without budget approval, over per-run or monthly ceiling", async () => {
    const { quotaGuard } = await import("@/lib/datamoon/quota");
    const r = { max_records: 100, approvals: { legal: "x", export: "y" } } as never;
    expect(quotaGuard(r, { remainingCredits: 1000, usedThisMonth: 0, limits: { maxRecordsPerRun: 500, monthlyRecordCeiling: 1000, budgetApproved: false } }).ok).toBe(false);
    expect(quotaGuard(r, { remainingCredits: 1000, usedThisMonth: 950, limits: { maxRecordsPerRun: 500, monthlyRecordCeiling: 1000, budgetApproved: true } }).ok).toBe(false);
    expect(quotaGuard(r, { remainingCredits: 50, usedThisMonth: 0, limits: { maxRecordsPerRun: 500, monthlyRecordCeiling: 1000, budgetApproved: true } }).ok).toBe(false);
    expect(quotaGuard(r, { remainingCredits: 1000, usedThisMonth: 0, limits: { maxRecordsPerRun: 50, monthlyRecordCeiling: 1000, budgetApproved: true } }).ok).toBe(false);
    expect(quotaGuard(r, { remainingCredits: 1000, usedThisMonth: 0, limits: { maxRecordsPerRun: 500, monthlyRecordCeiling: 1000, budgetApproved: true } }).ok).toBe(true);
  });
  it("importer dedupes, rejects bad ids, applies suppressions and drops unlisted columns", async () => {
    const { importCsv } = await import("@/lib/datamoon/importer");
    const { FIXTURE_EXPORT_CSV } = await import("@/lib/datamoon/fixtures");
    const { emailHash } = await import("@/lib/p4/ids");
    const csv = FIXTURE_EXPORT_CSV.replace("contact_id,", "contact_id,mobile_phone,").replace(/\n(id_|not_)/g, "\n555-0100,$1");
    const res = importCsv(csv.split("\n").map((l, i) => (i === 0 ? l : l.replace(/^555-0100,(.*)$/, (_m, rest) => { const parts = rest.split(","); return [parts[0], "555-0100", ...parts.slice(1)].join(","); }))).join("\n"), { suppressedHashes: new Set([emailHash("emery.optout@example.invalid")!]), existingContactIds: new Set() });
    expect(res.rejected.length).toBe(1);
    expect(res.duplicates.length).toBe(1);
    expect(res.suppressed.length).toBe(1);
    expect(res.dropped_columns).toContain("mobile_phone");
    expect(JSON.stringify(res.accepted)).not.toContain("555-0100");
    expect(res.accepted.every((c) => Object.values(c.provenance).every((v) => v === "DataMoon"))).toBe(true);
  });
  it("mock pipeline imports synthetic prospects into vendor_contacts (never leads) and enqueues crm.sync", async () => {
    const { runMockPipeline, addSuppression } = await import("@/lib/datamoon/service");
    await addSuppression("portfolioworks", "emery.optout@example.invalid", "test opt-out", staff("owner"));
    const out = await runMockPipeline("portfolioworks", "pw-value-add-investors", staff("owner"));
    expect(out?.import?.committed).toBeGreaterThan(0);
    const { db } = await import("@/lib/p4/db");
    const vc = await db.list("vendor_contacts", "portfolioworks", {});
    expect(vc.every((c) => c.synthetic === true && c.source === "datamoon")).toBe(true);
    expect(vc.find((c) => String(c.email ?? "").startsWith("emery"))?.status ?? "suppressed").toBe("suppressed");
    expect((await db.list("projects", "portfolioworks", {})).length).toBe(0);
    await expect(runMockPipeline("portfolioworks", "pw-value-add-investors", staff("marketer"))).rejects.toThrow(/Forbidden/);
    const failed = await runMockPipeline("portfolioworks", "pw-value-add-investors", staff("owner"), "expired_export");
    expect(failed?.import).toBeNull();
  });
  it("approvals: legal must come first, each needs its own permission, edits reset approvals", async () => {
    const S = await import("@/lib/datamoon/service");
    await expect(S.approveRecipe("portfolioworks", "pw-property-managers", "export", staff("owner"))).rejects.toThrow(/legal/);
    await expect(S.approveRecipe("portfolioworks", "pw-property-managers", "legal", staff("marketer"))).rejects.toThrow(/Forbidden/);
    await S.approveRecipe("portfolioworks", "pw-property-managers", "legal", staff("legal_reviewer"));
    const r = await S.approveRecipe("portfolioworks", "pw-property-managers", "export", staff("owner"));
    expect(r?.recipe.status).toBe("approved");
    const ed = await S.updateRecipe("portfolioworks", "pw-property-managers", { name: "HOA & property managers (edited)" }, staff("marketer"));
    expect(ed?.approvals.legal).toBeFalsy();
  });
});

describe("GHL mapping and outbox", () => {
  it("vendor prospects only map with flag + crm approval + destination, never when opted out, and never carry phone/opportunity", async () => {
    const { vendorContactToGhl } = await import("@/lib/datamoon/ghl");
    const { PW_RECIPES } = await import("@/lib/datamoon/recipes");
    const r = { ...PW_RECIPES[0], approved_destinations: ["ghl_email_nurture"], approvals: { legal: "a", export: "b", crm_sync: "c" } } as never;
    const c = { contact_id: "id_0000000000000a01", email: "a@example.invalid", first_name: "A", status: "prospect", provenance: {} } as never;
    expect(vendorContactToGhl(c, r, { crmSyncEnabled: false, optedOut: false })).toBeNull();
    expect(vendorContactToGhl(c, { ...(r as object), approvals: { legal: "a", export: "b" } } as never, { crmSyncEnabled: true, optedOut: false })).toBeNull();
    expect(vendorContactToGhl(c, r, { crmSyncEnabled: true, optedOut: true })).toBeNull();
    const m = vendorContactToGhl(c, r, { crmSyncEnabled: true, optedOut: false })!;
    expect(m.pipeline).toBeUndefined();
    expect(m.stage).toBeUndefined();
    expect(m.tags).toEqual(expect.arrayContaining(["source:datamoon", "intent:no-sms", "prospect:not-a-lead"]));
    expect(JSON.stringify(m)).not.toMatch(/phone/i);
  });
  it("internal pricing fields are stripped from GHL qualifier fields unless explicitly enabled", async () => {
    const { publicSafeQualifierFields, INTERNAL_PRICING_FIELDS } = await import("@/lib/p4/ghl-pricing");
    const f = { est_budget: "5k-10k", est_typical_range: "$8k–$15k", est_budget_fit: "ok", est_offer_guidance: "x", est_timeline: "spring" } as Record<string, string>;
    const out = publicSafeQualifierFields(f, {});
    for (const k of INTERNAL_PRICING_FIELDS) expect(out).not.toHaveProperty(k);
    expect(out.est_timeline).toBe("spring");
    expect(publicSafeQualifierFields(f, { GHL_SEND_INTERNAL_PRICING: "true" })).toHaveProperty("est_typical_range");
  });
  it("outbox: idempotent enqueue, backoff retries, dead-letter after max, replay", async () => {
    const O = await import("@/lib/p4/outbox");
    const a = await O.enqueue("portfolioworks", { type: "capture.submitted", ref_type: "project", ref_id: "p1", idempotency_key: "t:once" });
    const b = await O.enqueue("portfolioworks", { type: "capture.submitted", ref_type: "project", ref_id: "p1", idempotency_key: "t:once" });
    expect(b.duplicate).toBe(true); expect(b.event.id).toBe(a.event.id);
    const { db } = await import("@/lib/p4/db");
    for (const e of await db.list("event_outbox", "portfolioworks", { status: "pending" })) if (e.id !== a.event.id) await db.update("event_outbox", "portfolioworks", e.id, { status: "skipped" });
    const failing = { "capture.submitted": async () => ({ ok: false, error: "GHL 503" }) } as never;
    let now = Date.now();
    const s1 = await O.processOutbox("portfolioworks", failing, { now });
    expect(s1.retry).toBe(1);
    const ev1 = await db.get("event_outbox", "portfolioworks", a.event.id);
    expect(Date.parse(String(ev1?.next_attempt_at)) - now).toBe(O.BACKOFF_SECONDS[0] * 1000);
    expect((await O.processOutbox("portfolioworks", failing, { now })).processed).toBe(0); // not yet due
    for (let i = 1; i < O.MAX_ATTEMPTS; i++) { now += 13 * 3600_000; await O.processOutbox("portfolioworks", failing, { now }); }
    expect((await db.get("event_outbox", "portfolioworks", a.event.id))?.status).toBe("dead");
    await O.replay("portfolioworks", a.event.id);
    const ok = await O.processOutbox("portfolioworks", { "capture.submitted": async () => ({ ok: true }) } as never, { now: Date.now() + 1000 });
    expect(ok.done).toBe(1);
    expect((await db.get("event_outbox", "portfolioworks", a.event.id))?.status).toBe("done");
  });
  it("outbox payloads are flagged when they contain financial fields; handlers skip in log mode", async () => {
    const O = await import("@/lib/p4/outbox");
    const { event } = await O.enqueue("portfolioworks", { type: "capture.started", ref_type: "project", ref_id: "p2", idempotency_key: "t:fin", payload: { total: 100 } });
    expect(event.financial_fields).toBe(true);
    const { outboxHandlers } = await import("@/lib/p4/handlers");
    const h = outboxHandlers();
    expect(Object.keys(h)).toEqual(expect.arrayContaining(["capture.submitted", "crm.sync"]));
  });
  it("PW GHL mapping: walkthrough / proposal events → tags + existing opportunity stage; log mode skips; no prices on the wire", async () => {
    const { vi } = await import("vitest");
    const { db } = await import("@/lib/p4/db");
    const p = await db.insert("projects", "portfolioworks", { status: "walkthrough_invited", service: "turnover", customer_type: "property-manager", customer: { first_name: "Syn", email: "syn.pm@example.invalid" } });
    const { outboxHandlers } = await import("@/lib/p4/handlers");
    const h = outboxHandlers();
    const ev = (type: string) => ({ id: "e1", brand: "portfolioworks", type, ref_type: "project", ref_id: p.id, payload: { project_id: p.id } }) as never;
    // no credentials → log mode, nothing sent
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await h["walkthrough.requested"]!(ev("walkthrough.requested"))).toMatchObject({ ok: true, skipped: expect.stringMatching(/log mode/) });
    expect(fetchSpy).not.toHaveBeenCalled();
    // live mode with mocked GHL
    Object.assign(process.env, { GHL_PRIVATE_TOKEN: "t", GHL_LOCATION_ID: "loc", GHL_PIPELINE_MAIN: "pipe-main", GHL_STAGE_MAIN_WALKTHROUGH_REQUESTED: "stg-wr", GHL_STAGE_MAIN_PROPOSAL_SENT: "stg-ps" });
    const calls: { url: string; body: string }[] = [];
    fetchSpy.mockImplementation(async (u, init) => {
      const url = String(u); calls.push({ url, body: String(init?.body ?? "") });
      if (url.includes("/contacts/upsert")) return new Response(JSON.stringify({ contact: { id: "c1" } }), { status: 200 });
      if (url.includes("/opportunities/search")) return new Response(JSON.stringify({ opportunities: [{ id: "o1" }] }), { status: 200 });
      return new Response("{}", { status: 200 });
    });
    try {
      expect(await h["walkthrough.requested"]!(ev("walkthrough.requested"))).toMatchObject({ ok: true });
      const upsert = calls.find((c) => c.url.includes("/contacts/upsert"))!;
      expect(JSON.parse(upsert.body).tags).toEqual(expect.arrayContaining(["pw-walkthrough:requested", "co:portfolioworks"]));
      const move = calls.find((c) => c.url.endsWith("/opportunities/o1"))!;
      expect(JSON.parse(move.body)).toEqual({ pipelineStageId: "stg-wr" });
      calls.length = 0;
      expect(await h["proposal.marked_sent_externally"]!(ev("proposal.marked_sent_externally"))).toMatchObject({ ok: true });
      expect(JSON.parse(calls.find((c) => c.url.endsWith("/opportunities/o1"))!.body)).toEqual({ pipelineStageId: "stg-ps" });
      for (const c of calls) expect(c.body).not.toMatch(/monetaryValue|total|price|\$\d/i);
      expect(calls.some((c) => /conversations|messages|email|sms/i.test(c.url))).toBe(false);
    } finally {
      for (const k of ["GHL_PRIVATE_TOKEN", "GHL_LOCATION_ID", "GHL_PIPELINE_MAIN", "GHL_STAGE_MAIN_WALKTHROUGH_REQUESTED", "GHL_STAGE_MAIN_PROPOSAL_SENT"]) delete process.env[k];
      fetchSpy.mockRestore();
    }
  });
});
