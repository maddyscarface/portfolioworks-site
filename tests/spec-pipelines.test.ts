import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ghlPipelines, MAIN_STAGES, PARTNERSHIP_STAGES, CRM_STAGE_TO_KEY } from "@/config/ghl";
import { leadSchema, scoreLead } from "@/lib/leads";
import { buildGhlPlan } from "@/lib/crm/ghl";
import { buildRevenueRecord, googleAdsOfflineCsv, listConversions } from "@/lib/attribution/revenue";
import { POST } from "@/app/api/crm-webhook/route";
import { storeLead } from "@/lib/integrations";

const base = { funnel: "turnover", customerType: "landlord", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", phone: "5615550100", zip: "02134", units: 2, consentContact: true, eventId: "evt-spec-0001" };
afterEach(() => { delete process.env.GHL_STAGE_MAIN_WAITLIST; delete process.env.GHL_PIPELINE_MAIN; delete process.env.CRM_WEBHOOK_SECRET; });

describe("pipelines match docs/08", () => {
  it("main pipeline has the 14 spec'd stages plus Lost and Waitlist", () => {
    expect(MAIN_STAGES.map((s) => s[1])).toEqual(["New Lead", "Qualified", "Scope Intake", "Site Walk", "Estimate", "Proposal", "Negotiation", "Won", "Scheduled", "In Progress", "Punch List", "Complete", "Paid", "Repeat/Nurture", "Lost", "Waitlist – Non-launch Market"]);
    expect(ghlPipelines.main.stages.new_lead).toBe("GHL_STAGE_MAIN_NEW_LEAD");
    expect(ghlPipelines.main.stages.punch_list).toBe("GHL_STAGE_MAIN_PUNCH_LIST");
  });
  it("partnership pipeline has the 9 spec'd stages plus Not a Fit", () => {
    expect(PARTNERSHIP_STAGES.map((s) => s[1])).toEqual(["Prospect", "Contact Verified", "Outreach", "Discovery", "Vendor Prequalification", "Pilot Property", "Approved Vendor", "Recurring Work", "Expansion", "Not a Fit"]);
    expect(ghlPipelines.partnership.stages.new_lead).toBe("GHL_STAGE_PARTNERSHIP_PROSPECT");
    expect(ghlPipelines.partnership.stages.lost).toBe("GHL_STAGE_PARTNERSHIP_NOT_A_FIT");
  });
  it("every webhook stage maps to a real stage in each pipeline", () => {
    for (const p of ["main", "partnership"] as const)
      for (const k of Object.values(CRM_STAGE_TO_KEY[p])) expect(ghlPipelines[p].stages[k], `${p}.${k}`).toBeTruthy();
    expect(CRM_STAGE_TO_KEY.main.purchase).toBe("paid");
  });
});

describe("market routing (docs/08 workflows 1, 2, 14, 15)", () => {
  it("non-launch market (Florida) goes to the Waitlist stage with the waitlist hook, no sales hooks", () => {
    process.env.GHL_PIPELINE_MAIN = "pipe-main";
    process.env.GHL_STAGE_MAIN_WAITLIST = "stage-wait";
    const l = leadSchema.parse({ ...base, zip: "33401" });
    const plan = buildGhlPlan(l, scoreLead(l), "main");
    expect(plan.stageId).toBe("stage-wait");
    const ids = plan.followUps.map((f) => f.id);
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
  it("one conversion action per stage; value only on won/paid; proposal_sent excluded", () => {
    const a = { gclid: "G1" };
    const rows = googleAdsOfflineCsv([
      buildRevenueRecord("e1", "qualified_lead", 0, a), buildRevenueRecord("e1", "site_walk_booked", 0, a),
      buildRevenueRecord("e1", "proposal_sent", 0, a), buildRevenueRecord("e1", "purchase", 9000, a),
    ]).split("\n").slice(2);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("PortfolioWorks - Qualified Lead");
    expect(rows[1]).toContain("PortfolioWorks - Site Walk Booked");
    expect(rows[2]).toContain("PortfolioWorks - Paid");
    expect(rows[2]).toContain(",9000,");
  });
  it("webhook records qualified_lead into the conversions feed and reports the CRM stage", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s";
    await storeLead({ eventId: "lead-q-1", email: "q@example.com", customerType: "landlord", units: 1, funnel: "turnover", attribution: { gclid: "GQ" } });
    const r = await (await POST(new NextRequest("http://localhost/api/crm-webhook", { method: "POST", headers: { "content-type": "application/json", "x-pw-webhook-secret": "s" }, body: JSON.stringify({ eventId: "lead-q-1", stage: "qualified_lead" }) }))).json();
    expect(r.crmStage).toMatchObject({ pipeline: "main", stage: "qualified", label: "Qualified" });
    expect(r.revenue.ledger).toBe("conversions");
    expect((await listConversions()).some((c) => c.eventId === "lead-q-1" && c.gclid === "GQ")).toBe(true);
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
