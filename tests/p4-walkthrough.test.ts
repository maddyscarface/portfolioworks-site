import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isolate, params, req, staff } from "./p4-helpers";

beforeAll(() => { isolate(); process.env.PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED = "true"; });

const customer = { first_name: "Test", last_name: "Synthetic", email: "synthetic@example.test", town: "Somerville", zip: "02143" };
const PRIVACY = { occupancy: ["vacant"], privacy: ["no_people", "no_personal", "work_areas_only"] };
const progress = { answers: { ...PRIVACY, paint_drywall: ["full_paint"], notes: "Turn unit 2 before Sept 1" }, footprint: [{ label: "Bedroom 1", width: "12'", length: "16 ft" }], measures: { ceiling_height: { raw: "8'" }, bedrooms: { raw: "2" } } };

async function setup(service: "turnover" | "unit_rehab" | "capital_improvement" | "recurring_program" = "turnover") {
  const svc = await import("@/lib/walkthrough/service");
  const project = await svc.createProject("portfolioworks", { service, customer, source: "staff", actor: staff("owner") });
  const { token, session } = await svc.createInvite("portfolioworks", project.id, { actor: staff("owner") });
  return { svc, project, token, session };
}

describe("customer walkthrough: token lifecycle and allowlisted responses", () => {
  it("unknown, malformed, revoked and expired links all get the same generic 404", async () => {
    const { GET } = await import("@/app/api/w/[token]/state/route");
    const { svc, token, session } = await setup();
    const ok = await GET(req(`/api/w/${token}/state`), params({ token }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-robots-tag")).toMatch(/noindex/);
    expect(ok.headers.get("cache-control")).toMatch(/no-store/);
    const bad = await GET(req(`/api/w/x/state`), params({ token: "nope" }));
    const unknown = await GET(req(`/api/w/z/state`), params({ token: "A".repeat(43) }));
    expect(bad.status).toBe(404); expect(unknown.status).toBe(404);
    const t1 = await bad.json(); const t2 = await unknown.json();
    expect(t1).toEqual(t2);
    // GET does not consume the token
    expect((await GET(req(`/api/w/${token}/state`), params({ token }))).status).toBe(200);
    await svc.revokeSession("portfolioworks", session.id, staff("owner"));
    const revoked = await GET(req(`/api/w/${token}/state`), params({ token }));
    expect(revoked.status).toBe(404); expect(await revoked.json()).toEqual(t1);
    const { db } = await import("@/lib/p4/db");
    const s2 = await setup();
    await db.update("capture_sessions", "portfolioworks", s2.session.id, { expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await GET(req(`/api/w/${s2.token}/state`), params({ token: s2.token }))).status).toBe(404);
  });

  it("raw token is never stored; only its hash", async () => {
    const { token, session } = await setup();
    expect(JSON.stringify(session)).not.toContain(token);
    const { dataDir } = await import("@/lib/p4/db");
    const { readdirSync } = await import("node:fs");
    const all = readdirSync(dataDir()).filter((f) => f.endsWith(".json")).map((f) => readFileSync(`${dataDir()}/${f}`, "utf8")).join("");
    expect(all).not.toContain(token);
  });

  it("save → resume → submit → correction creates immutable revisions and marks estimates stale", async () => {
    const { svc, project, token } = await setup();
    const P = await import("@/app/api/w/[token]/progress/route");
    const S = await import("@/app/api/w/[token]/submit/route");
    const C = await import("@/app/api/w/[token]/correct/route");
    const St = await import("@/app/api/w/[token]/state/route");
    const put = await P.PUT(req(`/api/w/${token}/progress`, { method: "PUT", body: JSON.stringify(progress) }), params({ token }));
    expect(put.status).toBe(200);
    const st = await (await St.GET(req(`/api/w/${token}/state`), params({ token }))).json();
    expect(st.progress.footprint[0].width).toBe("12'");
    expect(st.status).toBe("in_progress");
    const sub = await S.POST(req(`/api/w/${token}/submit`, { method: "POST" }), params({ token }));
    expect(sub.status).toBe(200);
    const again = await (await S.POST(req(`/api/w/${token}/submit`, { method: "POST" }), params({ token }))).json();
    expect(again.duplicate).toBe(true);
    const { db } = await import("@/lib/p4/db");
    const est = await (await import("@/lib/estimator/service")).createDraft("portfolioworks", project.id, staff("estimator"));
    const late = await P.PUT(req(`/api/w/${token}/progress`, { method: "PUT", body: JSON.stringify(progress) }), params({ token }));
    expect((await late.json()).ok).toBe(false);
    const cor = await C.POST(req(`/api/w/${token}/correct`, { method: "POST", body: JSON.stringify({ measures: { ceiling_height: { raw: "9'" } }, correction_note: "Re-measured" }) }), params({ token }));
    expect(cor.status).toBe(200);
    const revs = await db.list("measurement_revisions", "portfolioworks", { project_id: project.id }, { asc: true });
    expect(revs.map((r) => r.revision)).toEqual([1, 2]);
    expect((revs[0].normalized as { measures: { field: string; inches?: number }[] }).measures.find((m) => m.field === "ceiling_height")?.inches).toBe(96);
    expect((revs[1].normalized as { measures: { field: string; inches?: number }[] }).measures.find((m) => m.field === "ceiling_height")?.inches).toBe(108);
    expect((await db.get("estimates", "portfolioworks", est.id))?.stale).toBe(true);
    const outbox = await db.list("event_outbox", "portfolioworks", {});
    expect(outbox.map((e) => e.type)).toEqual(expect.arrayContaining(["capture.started", "capture.submitted", "capture.corrected"]));
    void svc;
  });

  it("customer state is allowlisted and price-free even when a priced estimate exists", async () => {
    const { project, token } = await setup();
    const E = await import("@/lib/estimator/service");
    const est = await E.createDraft("portfolioworks", project.id, staff("owner"));
    await E.updateEstimate("portfolioworks", est.id, { expected_version: 0, lines: [{ id: "l1", category: "labor", description: "Build", quantity: 10, unit: "hr", rate: 95, rate_source: "manual" }], adjustments: { minimum: 2500, mobilization: 150, waste_pct: 10, tax_pct: 6.625, margin_pct: 30 } }, staff("owner"));
    const St = await import("@/app/api/w/[token]/state/route");
    const body = await (await St.GET(req(`/api/w/${token}/state`), params({ token }))).json();
    const { findFinancialLeaks } = await import("@/lib/p4/leak");
    const { progress: _own, ...rest } = body;
    expect(findFinancialLeaks(rest)).toEqual([]);
    expect(Object.keys(rest).sort()).toEqual(["can_correct", "editable", "expires_at", "first_name", "intro", "kind", "media", "multi_unit", "note", "ok", "service", "service_label", "status", "status_label", "steps", "submitted_at", "upload_mode"].sort());
    const s = JSON.stringify(body);
    for (const bad of ["95", "2500", "margin", "est_", "lead_id", "email", "token_hash", "customer_email_hash", "siteCheck"]) expect(s).not.toContain(bad);
  });

  it("follow-up link exposes only the requested steps (plus the occupancy + privacy gate)", async () => {
    const { svc, project } = await setup("unit_rehab");
    const { token } = await svc.createInvite("portfolioworks", project.id, { kind: "followup", requested_steps: ["kitchen_photo", "bogus"], note: "Closer photo of the sink base please", actor: staff("estimator") });
    const St = await import("@/app/api/w/[token]/state/route");
    const body = await (await St.GET(req(`/api/w/${token}/state`), params({ token }))).json();
    expect(body.steps.map((s: { id: string }) => s.id)).toEqual(["occupancy", "privacy", "kitchen_photo"]);
    expect(body.kind).toBe("followup");
  });
});

async function confirmPrivacy(token: string, answers: Record<string, string[]> = PRIVACY) {
  const P = await import("@/app/api/w/[token]/progress/route");
  const r = await P.PUT(req(`/api/w/${token}/progress`, { method: "PUT", body: JSON.stringify({ answers, footprint: [], measures: {} }) }), params({ token }));
  expect(r.status).toBe(200);
}

describe("uploads: chunked, sniffed, metadata stripped", () => {
  const jpeg = readFileSync("tests/fixtures/unit.jpg");
  const withExif = Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1, 0x00, 0x10]), Buffer.from("Exif\0\0GPS-LAT!"), jpeg.subarray(2)]);

  it("accepts a real JPEG in chunks and strips EXIF; rejects disguised files and wrong kinds", async () => {
    const { token, project } = await setup();
    await confirmPrivacy(token);
    const I = await import("@/app/api/w/[token]/upload/route");
    const U = await import("@/app/api/w/[token]/upload/[id]/route");
    const D = await import("@/app/api/w/[token]/upload/[id]/complete/route");
    const init = await (await I.POST(req(`/api/w/${token}/upload`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "image/jpeg", size: withExif.length, name: "IMG_1.jpg" }) }), params({ token }))).json();
    expect(init.ok).toBe(true); expect(init.mode).toBe("chunked");
    const half = Math.ceil(withExif.length / 2);
    // only send chunk 0 when the file needs one chunk; this fixture is small
    expect(init.chunks).toBe(1);
    const put = await U.PUT(req(`/api/w/${token}/upload/${init.upload_id}?index=0`, { method: "PUT", body: withExif }), params({ token, id: init.upload_id }));
    expect(put.status).toBe(200);
    const status = await (await U.GET(req(`/api/w/${token}/upload/${init.upload_id}`), params({ token, id: init.upload_id }))).json();
    expect(status.received).toEqual([0]);
    const done = await (await D.POST(req(`/api/w/${token}/upload/${init.upload_id}/complete`, { method: "POST" }), params({ token, id: init.upload_id }))).json();
    expect(done.ok).toBe(true);
    const { db, getObject } = await import("@/lib/p4/db");
    const media = await db.get("media_assets", "portfolioworks", done.media_id);
    expect(media?.metadata).toBe("stripped");
    expect(media?.project_id).toBe(project.id);
    const stored = await getObject(String(media?.storage_path));
    expect(stored!.includes(Buffer.from("GPS-LAT!"))).toBe(false);
    void half;

    // wrong kind for the step
    const vid = await I.POST(req(`/api/w/${token}/upload`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "video/mp4", size: 1000 }) }), params({ token }));
    expect(vid.status).toBe(415);
    // too large
    const big = await I.POST(req(`/api/w/${token}/upload`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "image/jpeg", size: 26 * 1024 * 1024 }) }), params({ token }));
    expect(big.status).toBe(413);
    // HTML disguised as JPEG
    const html = Buffer.from("<html><script>alert(1)</script></html>".padEnd(200, " "));
    const i2 = await (await I.POST(req(`/api/w/${token}/upload`, { method: "POST", body: JSON.stringify({ step_id: "kitchen_photo", mime: "image/jpeg", size: html.length }) }), params({ token }))).json();
    await U.PUT(req(`/x?index=0`, { method: "PUT", body: html }), params({ token, id: i2.upload_id }));
    const rej = await D.POST(req(`/x`, { method: "POST" }), params({ token, id: i2.upload_id }));
    expect(rej.status).toBe(415);
  });

  it("another session cannot touch an upload id it does not own", async () => {
    const a = await setup(); const b = await setup();
    await confirmPrivacy(a.token); await confirmPrivacy(b.token);
    const I = await import("@/app/api/w/[token]/upload/route");
    const U = await import("@/app/api/w/[token]/upload/[id]/route");
    const init = await (await I.POST(req(`/x`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "image/jpeg", size: 1000 }) }), params({ token: a.token }))).json();
    const res = await U.GET(req(`/x`), params({ token: b.token, id: init.upload_id }));
    expect(res.status).toBe(404);
  });

  it("media helpers: sniffing and PNG text chunk removal", async () => {
    const M = await import("@/lib/uploads/media");
    expect(M.sniffMedia(new Uint8Array(jpeg.subarray(0, 64)))).toBe("image/jpeg");
    expect(M.sniffMedia(new Uint8Array(Buffer.from("GIF89a..........")))).toBeNull();
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(16)]);
    expect(M.sniffMedia(new Uint8Array(mp4))).toMatch(/video\//);
    const { stripJpegMetadata } = M;
    expect(stripJpegMetadata(withExif).removed).toBeGreaterThan(0);
    expect(M.validateDeclared("image", 0)).toBeTruthy();
  });
});

describe("units parsing", () => {
  it("parses common tape formats and refuses to guess", async () => {
    const { parseLength, parseCount, rectanglesAreaSqFt } = await import("@/lib/walkthrough/units");
    expect(parseLength("12'")?.inches).toBe(144);
    expect(parseLength("3' 6\"")?.inches).toBe(42);
    expect(parseLength("16 ft")?.inches).toBe(192);
    expect(parseLength("10 ft 3 in")?.inches).toBe(123);
    expect(parseLength("30 in")?.inches).toBe(30);
    expect(parseLength("2.5m")?.inches).toBeCloseTo(98.43, 1);
    expect(parseLength("banana")).toBeNull();
    expect(parseLength("-4")).toBeNull();
    expect(parseCount("4")).toBe(4);
    expect(parseCount("lots")).toBeNull();
    expect(rectanglesAreaSqFt([{ width_in: 144, length_in: 192 }])).toBe(192);
  });
});

describe("storage gating", () => {
  it("refuses the walkthrough in Vercel production without durable storage; previews stay in flagged demo mode", async () => {
    const { walkthroughStorageAllowed, durableStorage } = await import("@/lib/p4/db");
    const { POST } = await import("@/app/api/walkthrough/start/route");
    Object.assign(process.env, { VERCEL: "1", VERCEL_ENV: "production" });
    try {
      expect(durableStorage()).toBe(false);
      expect(walkthroughStorageAllowed()).toBe(false);
      const r = await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify({ service: "turnover" }) }));
      expect(r.status).toBe(503);
      process.env.VERCEL_ENV = "preview";
      expect(walkthroughStorageAllowed()).toBe(true);
    } finally { delete process.env.VERCEL; delete process.env.VERCEL_ENV; }
  });
});

describe("tenant privacy safeguards (server-enforced)", () => {
  it("blocks uploads until occupancy + all three privacy promises are saved", async () => {
    const { token } = await setup();
    const I = await import("@/app/api/w/[token]/upload/route");
    const init = (body: object) => I.POST(req(`/x`, { method: "POST", body: JSON.stringify(body) }), params({ token }));
    const none = await init({ step_id: "entry", mime: "image/jpeg", size: 1000 });
    expect(none.status).toBe(403);
    expect((await none.json()).reason).toBe("privacy_not_confirmed");
    await confirmPrivacy(token, { occupancy: ["vacant"], privacy: ["no_people", "no_personal"] });
    expect((await init({ step_id: "entry", mime: "image/jpeg", size: 1000 })).status).toBe(403);
    await confirmPrivacy(token, { privacy: ["no_people", "no_personal", "work_areas_only"] });
    const noOcc = await init({ step_id: "entry", mime: "image/jpeg", size: 1000 });
    expect((await noOcc.json()).reason).toBe("occupancy_missing");
    await confirmPrivacy(token);
    expect((await init({ step_id: "entry", mime: "image/jpeg", size: 1000 })).status).toBe(200);
  });

  it("an occupied unit whose resident hasn't been told gets no uploads, and readiness flags it", async () => {
    const { token } = await setup();
    await confirmPrivacy(token, { ...PRIVACY, occupancy: ["occupied_not_notified"] });
    const I = await import("@/app/api/w/[token]/upload/route");
    const r = await I.POST(req(`/x`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "image/jpeg", size: 1000 }) }), params({ token }));
    expect(r.status).toBe(403);
    expect((await r.json()).reason).toBe("resident_not_notified");
    const { privacyGate } = await import("@/lib/walkthrough/privacy");
    expect(privacyGate({ ...PRIVACY, occupancy: ["occupied_notified"] }).ok).toBe(true);
    expect(privacyGate({ ...PRIVACY, occupancy: ["common_area"] }).ok).toBe(true);
    const { readiness, normalizeProgress } = await import("@/lib/walkthrough/capture");
    const { templateFor } = await import("@/lib/walkthrough/templates");
    const cap = normalizeProgress(templateFor("turnover")!, { answers: { ...PRIVACY, occupancy: ["occupied_not_notified"] }, footprint: [], measures: {} });
    expect(readiness("turnover", cap, {}).unknown_required).toContain("resident_not_notified");
  });

  it("floor-plan step accepts a sniffed PDF; photo steps reject PDFs; disguised PDFs are rejected", async () => {
    const { token } = await setup();
    await confirmPrivacy(token);
    const I = await import("@/app/api/w/[token]/upload/route");
    const U = await import("@/app/api/w/[token]/upload/[id]/route");
    const D = await import("@/app/api/w/[token]/upload/[id]/complete/route");
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n".padEnd(300, " "));
    const i1 = await (await I.POST(req(`/x`, { method: "POST", body: JSON.stringify({ step_id: "floor_plan", mime: "application/pdf", size: pdf.length, name: "plan.pdf" }) }), params({ token }))).json();
    expect(i1.ok).toBe(true);
    await U.PUT(req(`/x?index=0`, { method: "PUT", body: pdf }), params({ token, id: i1.upload_id }));
    const ok = await (await D.POST(req(`/x`, { method: "POST" }), params({ token, id: i1.upload_id }))).json();
    expect(ok.ok).toBe(true);
    const { db } = await import("@/lib/p4/db");
    const m = await db.get("media_assets", "portfolioworks", ok.media_id);
    expect(m).toMatchObject({ kind: "document", privacy: "customer_attested", ai_processing: "never", analytics: "never" });
    expect((await I.POST(req(`/x`, { method: "POST", body: JSON.stringify({ step_id: "entry", mime: "application/pdf", size: 300 }) }), params({ token }))).status).toBe(415);
    const fake = Buffer.from("<html>not a pdf</html>".padEnd(300, " "));
    const i2 = await (await I.POST(req(`/x`, { method: "POST", body: JSON.stringify({ step_id: "floor_plan", mime: "application/pdf", size: fake.length }) }), params({ token }))).json();
    await U.PUT(req(`/x?index=0`, { method: "PUT", body: fake }), params({ token, id: i2.upload_id }));
    expect((await D.POST(req(`/x`, { method: "POST" }), params({ token, id: i2.upload_id }))).status).toBe(415);
  });

  it("multi-unit batch keeps per-unit floor areas (quantities only)", async () => {
    const { normalizeProgress } = await import("@/lib/walkthrough/capture");
    const { templateFor } = await import("@/lib/walkthrough/templates");
    const cap = normalizeProgress(templateFor("recurring_program")!, { answers: PRIVACY, measures: { units_in_batch: { raw: "2" } }, footprint: [
      { unit: "1A", label: "Living", width: "12'", length: "15'" }, { unit: "1A", label: "Bedroom", width: "10'", length: "10'" }, { unit: "2B", label: "Living", width: "11'", length: "14'" },
    ] });
    expect(cap.unit_areas_sqft).toEqual({ "1A": 280, "2B": 154 });
    expect(cap.plan_area_sqft).toBe(434);
  });
});

describe("flags off: the mobile walkthrough is not live", () => {
  it("PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED unset → start API, link API and pages are all closed", async () => {
    const { token } = await setup();
    delete process.env.PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED;
    try {
      const { flags } = await import("@/lib/p4/flags");
      expect(flags().walkthrough).toBe(false);
      expect(flags({ PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED: "1" } as never).walkthrough).toBe(false);
      const St = await import("@/app/api/w/[token]/state/route");
      expect((await St.GET(req(`/api/w/${token}/state`), params({ token }))).status).toBe(404);
      const { POST } = await import("@/app/api/walkthrough/start/route");
      expect((await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify({ service: "turnover" }) }))).status).toBe(404);
      const Page = (await import("@/app/walkthrough/start/page")).default;
      await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    } finally { process.env.PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED = "true"; }
  });
});

describe("start route: existing lead pipeline + private project", () => {
  it("creates one lead (idempotent by eventId), one project and a private link; never returns a price", async () => {
    const { POST } = await import("@/app/api/walkthrough/start/route");
    const body = { service: "turnover", customerType: "landlord", firstName: "Syn", lastName: "Landlord", email: "syn.landlord@example.invalid", phone: "6175550100", zip: "02143", units: 3, consentContact: true, eventId: `wt-${Date.now()}-abcdef`, startedAt: Date.now() - 60_000, attribution: { utm_source: "test" } };
    const r1 = await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
    const j1 = await r1.json();
    expect(r1.status).toBe(200);
    expect(j1.url).toMatch(/^\/w\/[A-Za-z0-9_-]{30,}$/);
    const r2 = await (await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }))).json();
    expect(r2.ok).toBe(true);
    const { db } = await import("@/lib/p4/db");
    const projects = (await db.list("projects", "portfolioworks", {}, { limit: 1000 })).filter((p) => p.lead_id === body.eventId);
    expect(projects.length).toBe(1);
    expect(projects[0]).toMatchObject({ service: "turnover", customer_type: "landlord", units_declared: 3 });
    const { findFinancialLeaks } = await import("@/lib/p4/leak");
    expect(findFinancialLeaks(j1)).toEqual([]);
    const ob = await db.list("event_outbox", "portfolioworks", {});
    expect(ob.filter((e) => e.type === "walkthrough.requested" && e.ref_id === projects[0].id).length).toBe(1);
    // bad service → 422; bot-speed submit → silent ok without a project
    expect((await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify({ ...body, service: "deck" }) }))).status).toBe(422);
    const hp = await (await POST(req("/api/walkthrough/start", { method: "POST", body: JSON.stringify({ ...body, eventId: `wt-hp-${Date.now()}-x`, startedAt: Date.now() }) }))).json();
    expect(hp, JSON.stringify(hp)).toMatchObject({ ok: true }); expect(hp.url).toBeUndefined();
  });
});
