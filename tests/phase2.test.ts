import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadSchema, scoreLead, pipelineFor } from "@/lib/leads";
import { buildGhlPlan, ghlMode, redactPlan, syncLeadToGhl } from "@/lib/crm/ghl";
import { channelOf, summarizeTouches } from "@/lib/attribution";
import { buildRevenueRecord, googleAdsOfflineCsv, summarize } from "@/lib/attribution/revenue";
import { adapters, forwardLeadToIntent, intentConfig, intentTags } from "@/lib/intent";
import { mergeAttribution } from "@/components/Tracking";
import { photos } from "@/config/photos";
import fs from "node:fs";
import path from "node:path";

const base = {
  funnel: "turnover", customerType: "property-manager", firstName: "Pat", lastName: "Lee", email: "pat@example.com", phone: "6175550100",
  zip: "02134", units: 40, consentContact: true, eventId: "evt-12345678", services: ["rental-turnovers"], contractType: "recurring", budget: "15-50k", timeline: "asap",
  attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "turnovers-boston", gclid: "Cj0KCQ", first_touch_at: "2026-11-01T00:00:00.000Z", last_utm_source: "chatgpt", last_utm_medium: "paid", last_utm_campaign: "pw-chatgpt", last_touch_at: "2026-11-10T00:00:00.000Z" },
};
const lead = () => leadSchema.parse(base);
const ENV_KEYS = ["GHL_PRIVATE_TOKEN", "GHL_LOCATION_ID", "GHL_MODE", "GHL_PIPELINE_MAIN", "GHL_STAGE_MAIN_NEW_LEAD", "GHL_PIPELINE_PARTNERSHIP", "GHL_STAGE_PARTNERSHIP_PROSPECT", "GHL_WORKFLOW_PARTNERSHIP", "GHL_PIPELINE_MA", "INTENT_PROVIDER", "INTENT_ENABLED", "INTENT_API_KEY", "INTENT_API_URL"];
const saved: Record<string, string | undefined> = {};
beforeEach(() => ENV_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; }));
afterEach(() => { ENV_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }); vi.restoreAllMocks(); });

describe("GoHighLevel plan", () => {
  it("routes a 40-unit recurring PM to the partnership pipeline with tier + follow-up tags", () => {
    const l = lead();
    const s = scoreLead(l);
    const pipeline = pipelineFor(l);
    expect(pipeline).toBe("partnership");
    const plan = buildGhlPlan(l, s, pipeline);
    expect(plan.pipelineLabel).toContain("Portfolio Partnership");
    expect(plan.tags).toContain("co:portfolioworks");
    expect(plan.tags).toContain(`pw-tier:${s.tier}`);
    expect(plan.tags).toContain("pw-fu:partnership");
    expect(plan.removeTags).not.toContain(`pw-tier:${s.tier}`);
    expect(plan.removeTags).toHaveLength(2);
    expect(plan.missingIds).toEqual(["GHL_LOCATION_ID", "GHL_PIPELINE_PARTNERSHIP", "GHL_STAGE_PARTNERSHIP_PROSPECT"]);
    const f = Object.fromEntries(plan.contact.customFields.map((c) => [c.key, c.field_value]));
    expect(f.pw_lead_score).toBe(s.score);
    expect(f.pw_first_channel).toBe("paid_search_google");
    expect(f.pw_last_channel).toBe("chatgpt_ads");
  });
  it("uses a market pipeline override for Greater Boston when configured", () => {
    process.env.GHL_PIPELINE_MA = "pipe-ma";
    const l = leadSchema.parse({ ...base, customerType: "landlord", units: 2, contractType: "single-project" });
    const plan = buildGhlPlan(l, scoreLead(l), "main");
    expect(plan.pipelineId).toBe("pipe-ma");
    expect(plan.missingIds).toContain("GHL_STAGE_MA_NEW_LEAD");
  });
  it("out-of-area leads get the honest availability follow-up, not speed-to-lead", () => {
    const l = leadSchema.parse({ ...base, zip: "90210" });
    const plan = buildGhlPlan(l, scoreLead(l), "main");
    expect(plan.followUps.map((x) => x.id)).toContain("out_of_area");
    expect(plan.followUps.map((x) => x.id)).not.toContain("speed_to_lead");
  });
  it("redacts PII in log output", () => {
    const l = lead();
    const r = JSON.stringify(redactPlan(buildGhlPlan(l, scoreLead(l), "main")));
    expect(r).not.toContain("pat@example.com");
    expect(r).not.toContain("6175550100");
  });
  it("log mode makes no network calls", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(ghlMode()).toBe("log");
    const r = await syncLeadToGhl(lead(), scoreLead(lead()), "partnership");
    expect(r.skipped).toBe("not-configured");
    expect(spy).not.toHaveBeenCalled();
  });
  it("live mode updates an existing open opportunity instead of creating a duplicate", async () => {
    Object.assign(process.env, { GHL_PRIVATE_TOKEN: "t", GHL_LOCATION_ID: "loc", GHL_PIPELINE_PARTNERSHIP: "p1", GHL_STAGE_PARTNERSHIP_PROSPECT: "s1", GHL_WORKFLOW_PARTNERSHIP: "wf1" });
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      calls.push(`${init?.method ?? "GET"} ${u.replace("https://services.leadconnectorhq.com", "")}`);
      if (u.endsWith("/contacts/upsert")) return new Response(JSON.stringify({ contact: { id: "c1" } }));
      if (u.includes("/opportunities/search")) return new Response(JSON.stringify({ opportunities: [{ id: "o1", monetaryValue: 999999 }] }));
      return new Response("{}");
    });
    const r = await syncLeadToGhl(lead(), scoreLead(lead()), "partnership");
    expect(r).toMatchObject({ ok: true, contactId: "c1", opportunityId: "o1", opportunity: "updated" });
    expect(calls.some((c) => c.startsWith("POST /opportunities/"))).toBe(false);
    expect(calls).toContain("PUT /opportunities/o1");
    expect(calls).toContain("POST /contacts/c1/workflow/wf1");
    expect(calls).toContain("DELETE /contacts/c1/tags");
  });
  it("live mode creates the opportunity when none is open", async () => {
    Object.assign(process.env, { GHL_PRIVATE_TOKEN: "t", GHL_LOCATION_ID: "loc", GHL_PIPELINE_MAIN: "p", GHL_STAGE_MAIN_NEW_LEAD: "s" });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/contacts/upsert")) return new Response(JSON.stringify({ contact: { id: "c2" } }));
      if (u.includes("/opportunities/search")) return new Response(JSON.stringify({ opportunities: [] }));
      if (u.endsWith("/opportunities/")) return new Response(JSON.stringify({ opportunity: { id: "o2" } }));
      return new Response("{}");
    });
    const r = await syncLeadToGhl(lead(), scoreLead(lead()), "main");
    expect(r).toMatchObject({ ok: true, opportunityId: "o2", opportunity: "created" });
  });
});

describe("attribution", () => {
  it("classifies channels", () => {
    expect(channelOf({ gclid: "x" })).toBe("paid_search_google");
    expect(channelOf({ fbclid: "x" })).toBe("paid_social_meta");
    expect(channelOf({ msclkid: "x" })).toBe("paid_search_microsoft");
    expect(channelOf({ openai_oppref: "x" })).toBe("chatgpt_ads");
    expect(channelOf({ referrer: "https://www.google.com/" })).toBe("organic_search");
    expect(channelOf({ referrer: "https://biggerpockets.com/x" })).toBe("referral");
    expect(channelOf({})).toBe("direct");
  });
  it("keeps first touch and records last touch in the browser merge", () => {
    const ctx = { path: "/", referrer: "", now: "2026-11-01T00:00:00.000Z", host: "pw.test" };
    const first = mergeAttribution({}, new URLSearchParams("utm_source=google&utm_medium=cpc&gclid=G1"), ctx);
    expect(first).toMatchObject({ utm_source: "google", gclid: "G1", first_touch_at: ctx.now, touches: 1 });
    const same = mergeAttribution(first, new URLSearchParams(""), { ...ctx, now: "2026-11-02T00:00:00.000Z" });
    expect(same).toBe(first);
    const second = mergeAttribution(first, new URLSearchParams("utm_source=facebook&utm_medium=paid&fbclid=F1"), { ...ctx, now: "2026-11-05T00:00:00.000Z" });
    expect(second).toMatchObject({ utm_source: "google", gclid: "G1", fbclid: "F1", last_utm_source: "facebook", touches: 2 });
    const t = summarizeTouches(second as Record<string, string>);
    expect(t.firstChannel).toBe("paid_search_google");
    expect(t.lastChannel).toBe("paid_social_meta");
  });
});

describe("revenue attribution", () => {
  it("builds records, summarizes by channel and exports Google Ads offline CSV", () => {
    const a = buildRevenueRecord("e1", "contract_signed", 12500, { gclid: "G1", utm_source: "google", utm_medium: "cpc", utm_campaign: "c1" }, new Date("2026-11-10T15:04:05Z"));
    const b = buildRevenueRecord("e2", "purchase", 4000, { fbclid: "F1" }, new Date("2026-11-11T00:00:00Z"));
    const s = summarize([a, b]);
    expect(s.total).toBe(16500);
    expect(s.byFirstTouch[0]).toMatchObject({ key: "paid_search_google", revenue: 12500 });
    const csv = googleAdsOfflineCsv([a, b]).split("\n");
    expect(csv[0]).toBe("Parameters:TimeZone=+0000");
    expect(csv).toHaveLength(3); // only the gclid row is exported
    expect(csv[2]).toContain("G1,,,PortfolioWorks - Contract Signed,2026-11-10 15:04:05+0000,12500,USD,e1:contract_signed");
  });
});

describe("intent adapter", () => {
  it("is disabled by default and sends nothing", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(intentConfig().enabled).toBe(false);
    const r = await forwardLeadToIntent({ eventId: "e", email: "a@b.co", adsConsent: true, tier: "hot", customerType: "landlord" });
    expect(r.skipped).toBe("disabled");
    expect(spy).not.toHaveBeenCalled();
  });
  it("requires ad consent even when enabled", async () => {
    Object.assign(process.env, { INTENT_PROVIDER: "datamoon", INTENT_ENABLED: "true", INTENT_API_KEY: "k", INTENT_API_URL: "https://example.invalid/ingest" });
    const r = await forwardLeadToIntent({ eventId: "e", email: "a@b.co", adsConsent: false, tier: "hot", customerType: "landlord" });
    expect(r.skipped).toBe("no-consent");
  });
  it("hashes identifiers and normalizes webhooks for both providers", () => {
    const p = adapters.datamoon.leadPayload({ eventId: "e", email: "A@B.co ", adsConsent: true, tier: "hot", customerType: "landlord" });
    expect(JSON.stringify(p)).not.toContain("a@b.co");
    const sigs = adapters.audiencelab.parseWebhook({ data: [{ EMAIL: "x@y.com", SEGMENT: "property management, renovation" }] });
    expect(sigs[0]).toMatchObject({ provider: "audiencelab", email: "x@y.com", topics: ["property management", "renovation"] });
    expect(intentTags(sigs[0])).toContain("intent-topic:property-management");
  });
});

describe("photo library", () => {
  it("every photo file exists and is logged in the licence manifest", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/photos/manifest.json"), "utf8"));
    const files = new Set(manifest.photos.map((p: { file: string }) => p.file));
    for (const p of Object.values(photos)) {
      expect(files.has(p.src)).toBe(true);
      expect(p.alt.length).toBeGreaterThan(10);
    }
    for (const m of manifest.photos) {
      expect(m.license).toMatch(/Pexels License/);
      expect(m.sourceUrl).toMatch(/^https:\/\/www\.pexels\.com\/photo\//);
    }
  });
});
