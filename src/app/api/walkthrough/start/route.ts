import { z } from "zod";
import { NextRequest } from "next/server";
import { POST as submitLead } from "@/app/api/leads/route";
import { BRAND, flags } from "@/lib/p4/flags";
import { db, walkthroughStorageAllowed } from "@/lib/p4/db";
import { enqueue } from "@/lib/p4/outbox";
import { createInvite, createProject } from "@/lib/walkthrough/service";
import { WALKTHROUGH_SERVICES } from "@/lib/walkthrough/templates";
import { json } from "@/lib/walkthrough/http";

export const runtime = "nodejs";

const extra = z.object({ service: z.enum(WALKTHROUGH_SERVICES) });
const SERVICES: Record<string, string[]> = {
  turnover: ["rental-turnovers"], unit_rehab: ["full-rehab"], capital_improvement: ["capital-improvements"], recurring_program: ["property-maintenance"],
};

/**
 * Starts a guided walkthrough (behind PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED). The lead goes through the EXISTING
 * /api/leads pipeline unchanged (validation, spam checks, idempotency, storage guard, GHL, attribution), then a
 * private project + 14-day link is created. Never returns a price.
 */
export async function POST(req: Request) {
  if (!flags().walkthrough) return json({ ok: false, error: "Not available" }, 404);
  if (!walkthroughStorageAllowed()) return json({ ok: false, error: "The guided walkthrough isn't available yet. Please use the property walkthrough request form instead." }, 503);
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const ex = extra.safeParse(body);
  if (!ex.success) return json({ ok: false, error: "Choose the type of work.", fields: { service: "Required" } }, 422);
  const { service } = ex.data;
  const leadBody = { ...body, funnel: "walkthrough", services: SERVICES[service], contractType: service === "recurring_program" ? "recurring" : "unsure", description: `Guided walkthrough started (${service}).` };
  delete (leadBody as Record<string, unknown>).service;

  const leadReq = new NextRequest(new URL("/api/leads", req.url), { method: "POST", headers: req.headers, body: JSON.stringify(leadBody) });
  const leadRes = await submitLead(leadReq);
  const lead = (await leadRes.json()) as { ok?: boolean; eventId?: string; error?: string; issues?: { path: string; message: string }[]; tier?: string };
  if (!leadRes.ok || !lead.ok) {
    const fields = Object.fromEntries((lead.issues ?? []).map((i) => [i.path.split(".")[0], i.message]));
    return json({ ok: false, error: lead.error === "Validation failed" ? "Please check the highlighted fields." : lead.error ?? "Please try again.", fields }, leadRes.status || 422);
  }
  if (!lead.eventId || (!("pipeline" in lead) && !(lead as { duplicate?: boolean }).duplicate)) {
    // Honeypot / too-fast submits get a silent "ok" from the lead API with no record: don't create a project.
    return json({ ok: true, id: "ignored" });
  }
  try {
    const existing = await db.findOne("projects", BRAND, { lead_id: lead.eventId });
    const project = existing ?? await createProject(BRAND, {
      lead_id: lead.eventId, service, source: "website", customer_type: String(body.customerType ?? "landlord"),
      customer: { first_name: String(body.firstName ?? ""), last_name: String(body.lastName ?? ""), email: String(body.email ?? ""), phone: String(body.phone ?? ""), zip: String(body.zip ?? ""), address: String(body.propertyAddress ?? "").slice(0, 240) }, actor: "system",
    });
    if (!existing) await db.update("projects", BRAND, project.id, { units_declared: Number(body.units ?? 1) || 1, company: String(body.company ?? "").slice(0, 160) });
    const { token } = await createInvite(BRAND, project.id, { kind: "initial", actor: "system" });
    await enqueue(BRAND, { type: "walkthrough.requested", ref_type: "project", ref_id: project.id, idempotency_key: `walkthrough.requested:${project.id}`, payload: { project_id: project.id, lead_id: lead.eventId, service } });
    return json({ ok: true, id: lead.eventId, url: `/w/${token}` });
  } catch (e) {
    console.error("[walkthrough:start]", e instanceof Error ? e.message : e);
    return json({ ok: false, error: "We couldn't start your walkthrough. Please try again or use the contact page." }, 500);
  }
}
