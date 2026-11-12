import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ghlPipelines, PROJECT_STAGES, PARTNERSHIP_STAGES, CRM_STAGE_TO_KEY } from "@/config/ghl";
import { leadSchema, scoreLead, pipelineFor } from "@/lib/leads";
import { buildGhlPlan } from "@/lib/crm/ghl";
import { buildRevenueRecord, googleAdsOfflineCsv, listConversions, listRevenue, summarize } from "@/lib/attribution/revenue";
import { POST } from "@/app/api/crm-webhook/route";
import { storeLead } from "@/lib/integrations";
import { sanitizeDetails } from "@/config/funnel-fields";

const base = { funnel: "turnover", customerType: "landlord", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", phone: "5615550100", zip: "02134", units: 2, consentContact: true, eventId: "evt-spec-0001" };
afterEach(() => { delete process.env.GHL_STAGE_MAIN_NEW_INQUIRY; delete process.env.GHL_STAGE_MAIN_NEW_LEAD; delete process.env.GHL_PIPELINE_MAIN; delete process.env.CRM_WEBHOOK_SECRET; });

describe("pipelines match specs/03 §3", () => {
  it("project pipeline has exactly the spec'd stages, in order", () => {
    expect(PROJECT_STAGES.map((s) => s[1])).toEqual(["New inquiry", "Qualified", "Walkthrough requested", "Walkthrough completed", "Scope developing", "Proposal sent", "Awarded", "In progress", "Closeout", "Repeat opportunity"]);
    expect(ghlPipelines.main.stages.new_inquiry).toBe("GHL_STAGE_MAIN_NEW_INQUIRY");
    expect(ghlPipelines.residential.stages.closeout).toBe("GHL_STAGE_RESIDENTIAL_CLOSEOUT");
  });
  it("separate portfolio / recurring-contract pipeline with consultation before any proposal", () => {
    const names = PARTNERSHIP_STAGES.map((s) => s[1]);
    expect(names.indexOf("Consultation")).toBeLessThan(names.indexOf("Pilot property"));
    expect(ghlPipelines.partnership.stages.prospect).toBe("GHL_STAGE_PARTNERSHIP_PROSPECT");
  });
  it("every webhook stage maps to a real stage in each pipeline", () => {
    for (const p of ["main", "residential", "partnership"] as const)
      for (const k of Object.values(CRM_STAGE_TO_KEY[p])) expect(ghlPipelines[p].stages[k], `${p}.${k}`).toBeTruthy();
    expect(CRM_STAGE_TO_KEY.main.contract_signed).toBe("awarded");
    expect(CRM_STAGE_TO_KEY.main.purchase).toBe("closeout");
  });
  it("homeowners never share a pipeline with landlord / PM opportunities", () => {
    expect(pipelineFor(leadSchema.parse({ ...base, funnel: "rehab", customerType: "homeowner" }))).toBe("residential");
    expect(pipelineFor(leadSchema.parse({ ...base, funnel: "rehab", customerType: "landlord" }))).toBe("main");
    expect(pipelineFor(leadSchema.parse({ ...base, funnel: "portfolio", customerType: "property-manager", units: 80 }))).toBe("partnership");
  });
  it("legacy GHL_STAGE_MAIN_NEW_LEAD still works as the entry stage", () => {
    process.env.GHL_PIPELINE_MAIN = "pipe-main"; process.env.GHL_STAGE_MAIN_NEW_LEAD = "legacy";
    const l = leadSchema.parse({ ...base, zip: "33401" });
    expect(buildGhlPlan(l, scoreLead(l), "main").stageId).toBe("legacy");
  });
});

describe("funnel fields (specs/03 §2)", () => {
  it("keeps only known fields/options per funnel and writes them to CRM fields", () => {
    const d = sanitizeDetails("turnover", { occupancy: "vacant", unit_size: "2br", approver: "nope", current_pm: " Acme PM ", geography: "x" });
    expect(d).toEqual({ occupancy: "vacant", unit_size: "2br", current_pm: "Acme PM" });
    expect(sanitizeDetails("portfolio", { project_mix: ["turnovers", "bad", "capex"] })).toEqual({ project_mix: "turnovers,capex" });
    const l = leadSchema.parse({ ...base, details: d });
    const plan = buildGhlPlan(l, scoreLead(l), "main");
    const f = Object.fromEntries(plan.contact.customFields.map((c) => [c.key, c.field_value]));
    expect(f.pw_d_occupancy).toBe("vacant");
    expect(f.pw_buyer_role).toContain("landlord");
    expect(plan.note).toContain("Unit size: 2 bedrooms");
  });
});

describe("market routing (docs/08 workflows 1, 2, 14, 15)", () => {
  it("non-launch market (Florida) gets the waitlist hook, no sales hooks", () => {
    const l = leadSchema.parse({ ...base, zip: "33401" });
    const ids = buildGhlPlan(l, scoreLead(l), "main").followUps.map((f) => f.id);
    expect(ids).toContain("waitlist");
    expect(ids).not.toContain("instant_response");
    expect(ids).not.toContain("out_of_area");
  });
  it("Greater Boston turnover without photos gets instant response + photo request", () => {
    const l = leadSchema.parse(base);
    const ids = buildGhlPlan(l, scoreLead(l), "main").followUps.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["instant_response", "photo_request"]));
    const withPhotos = leadSchema.parse({ ...base, photoUrls: ["https://example.com/a.jpg"] });
    expect(buildGhlPlan(withPhotos, scoreLead(withPhotos), "main").followUps.map((f) => f.id)).not.toContain("photo_request");
  });
  it("sets pw_property_addresses", () => {
    const l = leadSchema.parse({ ...base, propertyAddress: "12 Elm St, Boston" });
    const f = Object.fromEntries(buildGhlPlan(l, scoreLead(l), "main").contact.customFields.map((c) => [c.key, c.field_value]));
    expect(f.pw_property_addresses).toBe("12 Elm St, Boston");
  });
});

describe("Google Ads offline conversions (docs/11 event map)", () => {
  it("one conversion action per specs/03 §4 event; value only on revenue stages; lost excluded", () => {
    const a = { gclid: "G1" };
    const rows = googleAdsOfflineCsv([
      buildRevenueRecord("e1", "qualified_lead", 0, a), buildRevenueRecord("e1", "site_walk_booked", 0, a),
      buildRevenueRecord("e1", "proposal_sent", 0, a), buildRevenueRecord("e1", "lost", 0, a), buildRevenueRecord("e1", "purchase", 9000, a),
    ]).split("\n").slice(2);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain("PortfolioWorks - Qualified Lead");
    expect(rows[1]).toContain("PortfolioWorks - Walkthrough Scheduled");
    expect(rows[2]).toContain("PortfolioWorks - Estimate Sent");
    expect(rows[3]).toContain("PortfolioWorks - Realized Revenue");
    expect(rows[3]).toContain(",9000,");
  });
  it("webhook records qualified_lead into the conversions feed and reports the CRM stage", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s";
    await storeLead({ eventId: "lead-q-1", email: "q@example.com", customerType: "landlord", units: 1, funnel: "turnover", attribution: { gclid: "GQ" } });
    const r = await (await POST(new NextRequest("http://localhost/api/crm-webhook", { method: "POST", headers: { "content-type": "application/json", "x-pw-webhook-secret": "s" }, body: JSON.stringify({ eventId: "lead-q-1", stage: "qualified_lead" }) }))).json();
    expect(r.crmStage).toMatchObject({ pipeline: "main", stage: "qualified", label: "Qualified" });
    expect(r.revenue.ledger).toBe("conversions");
    expect((await listConversions()).some((c) => c.eventId === "lead-q-1" && c.gclid === "GQ")).toBe(true);
  });
  it("accepts specs/03 §4 event names and tracks deal value vs realized revenue", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s";
    await storeLead({ eventId: "lead-r-1", email: "r@example.com", customerType: "homeowner", units: 1, funnel: "rehab", attribution: {} });
    const call = (stage: string, value?: number) => POST(new NextRequest("http://localhost/api/crm-webhook", { method: "POST", headers: { "content-type": "application/json", "x-pw-webhook-secret": "s" }, body: JSON.stringify({ eventId: "lead-r-1", stage, value }) })).then((r) => r.json());
    expect((await call("walkthrough_scheduled")).crmStage).toMatchObject({ pipeline: "residential", stage: "walkthrough_requested" });
    expect((await call("proposal_won", 40000)).crmStage).toMatchObject({ stage: "awarded", label: "Awarded" });
    expect((await call("realized_revenue", 42500)).crmStage).toMatchObject({ stage: "closeout" });
    const sum = summarize(await listRevenue());
    expect(sum.dealValue).toBeGreaterThanOrEqual(40000);
    expect(sum.realizedRevenue).toBeGreaterThanOrEqual(42500);
  });
});

import { serviceFromPath } from "@/components/Tracking";
describe("view_service (docs/11)", () => {
  it("fires for service pages and /rental-turnovers only", () => {
    expect(serviceFromPath("/services/flooring")).toBe("flooring");
    expect(serviceFromPath("/rental-turnovers")).toBe("rental-turnovers");
    expect(serviceFromPath("/services")).toBeNull();
    expect(serviceFromPath("/landlords")).toBeNull();
  });
});

import { photos, photoMeta, isOwnWork, type PhotoKey } from "@/config/photos";
import { site } from "@/config/site";
describe("brand & image library (specs/03 §1)", () => {
  it("homepage pathways are the three spec'd CTAs", () => {
    expect(site.pathways.map((p) => p.label)).toEqual(["Plan a Unit Turnover", "Request Renovation Estimate", "Discuss a Portfolio Program"]);
  });
  it("every photo carries city/scope/copyright/status and none is claimed as our work", () => {
    for (const k of Object.keys(photos) as PhotoKey[]) {
      const m = photoMeta(k);
      expect(m.copyright).toMatch(/Pexels/);
      expect(isOwnWork(k)).toBe(false);
    }
  });
});
