import "server-only";
import { db, type Row } from "./db";
import { BRAND, flags } from "./flags";
import { can, type Staff } from "./rbac";
import { maskEmail } from "./pii";
import { staffEstimateView } from "../estimator/service";
import { integrationStatus, listLeads, memoryStoreBlocked } from "../integrations";
import { ghlMode, ghlStatus } from "../crm/ghl";
import { dmStatus } from "../datamoon/config";
import { measurementProviders } from "../measure/providers";
import { storageMode } from "./db";
import { listConfiguredStaff } from "./auth";

/** Everything the project page needs, filtered by role (PII masked without pii.read; estimates hidden without estimate.read). */
export async function projectDetail(id: string, staff: Staff) {
  const project = await db.get("projects", BRAND, id);
  if (!project) return null;
  const pii = can(staff, "pii.read", BRAND);
  const [sessions, media, revisions, estimates, followups, exports] = await Promise.all([
    db.list("capture_sessions", BRAND, { project_id: id }), db.list("media_assets", BRAND, { project_id: id }, { asc: true }), db.list("measurement_revisions", BRAND, { project_id: id }),
    can(staff, "estimate.read", BRAND) ? db.list("estimates", BRAND, { project_id: id }) : Promise.resolve([]), db.list("capture_followups", BRAND, { project_id: id }),
    can(staff, "proposal.export", BRAND) ? db.list("proposal_exports", BRAND, { project_id: id }) : Promise.resolve([]),
  ]);
  const c = project.customer as Record<string, string> | undefined;
  return {
    project: { ...project, customer: pii ? c : { first_name: c?.first_name, town: c?.town, email: maskEmail(c?.email) } } as Row,
    sessions: sessions.map(({ token_hash: _t, ...s }) => s),
    media: can(staff, "media.read", BRAND) ? media.filter((m) => m.status === "validated") : [],
    revisions, followups, exports,
    estimates: estimates.map((e) => staffEstimateView(e, staff, BRAND)),
  };
}

/** Admin view of a stored PortfolioWorks lead (Upstash / dev memory). The stored IP is never surfaced. */
export type StoredLead = {
  id: string; created_at: string; form_type: string; funnel: string; first_name?: string; last_name?: string; email?: string; phone?: string; company_name?: string;
  town?: string; zip?: string; customer_type?: string; services: string[]; status: string; lead_score?: number; lead_tier?: string; pipeline?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; gclid?: string; fbclid?: string; walkthrough_requested: boolean; ghl_sync_status: string;
};
export function toStoredLead(r: Record<string, unknown>): StoredLead {
  const a = (r.attribution ?? {}) as Record<string, string | undefined>;
  const sc = (r.score ?? {}) as { score?: number; tier?: string };
  const str = (v: unknown) => (v == null || v === "" ? undefined : String(v));
  return {
    id: String(r.eventId ?? ""), created_at: String(r.receivedAt ?? ""), form_type: String(r.funnel ?? ""), funnel: String(r.funnel ?? ""),
    first_name: str(r.firstName), last_name: str(r.lastName), email: str(r.email), phone: str(r.phone), company_name: str(r.company),
    town: str(r.propertyAddress), zip: str(r.zip), customer_type: str(r.customerType), services: Array.isArray(r.services) ? (r.services as string[]) : [],
    status: "new", lead_score: typeof sc.score === "number" ? sc.score : undefined, lead_tier: sc.tier, pipeline: str(r.pipeline),
    utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign, gclid: a.gclid, fbclid: a.fbclid,
    walkthrough_requested: r.funnel === "walkthrough", ghl_sync_status: ghlMode() === "live" ? "synced at intake" : ghlMode(),
  };
}

export async function safeLeads(limit = 1000): Promise<{ rows: StoredLead[]; error: string }> {
  if (memoryStoreBlocked()) return { rows: [], error: "Lead store not configured (Upstash required in production)." };
  try { return { rows: (await listLeads()).slice(0, limit).map(toStoredLead), error: "" }; } catch (e) { return { rows: [], error: e instanceof Error ? e.message : String(e) }; }
}

/** Global staff search across leads, projects and vendor prospects. */
export async function search(q: string, staff: Staff) {
  const s = q.toLowerCase().trim();
  if (s.length < 2) return { leads: [], projects: [], prospects: [] };
  const pii = can(staff, "pii.read", BRAND);
  const hit = (v: unknown) => JSON.stringify(v ?? "").toLowerCase().includes(s);
  const leads = can(staff, "leads.read", BRAND) ? (await safeLeads()).rows.filter((l) => hit([l.id, l.first_name, l.last_name, l.email, l.town, l.zip, l.company_name, l.services])).slice(0, 50)
    .map((l) => ({ id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(" "), email: pii ? l.email : maskEmail(String(l.email ?? "")), town: l.town, status: l.status, created_at: l.created_at })) : [];
  const projects = can(staff, "projects.read", BRAND) ? (await db.list("projects", BRAND, {}, { limit: 1000 })).filter((p) => hit([p.id, p.service, p.status, p.customer])).slice(0, 50)
    .map((p) => ({ id: p.id, service: p.service, status: p.status, name: (p.customer as { first_name?: string })?.first_name ?? "", town: (p.customer as { town?: string })?.town ?? "" })) : [];
  const prospects = can(staff, "datamoon.read", BRAND) ? (await db.list("vendor_contacts", BRAND, {}, { limit: 2000 })).filter((v) => hit([v.contact_id, v.first_name, v.last_name, v.city, v.zip])).slice(0, 50)
    .map((v) => ({ id: v.id, contact_id: v.contact_id, name: [v.first_name, v.last_name].filter(Boolean).join(" "), city: v.city, status: v.status, synthetic: v.synthetic })) : [];
  return { leads, projects, prospects };
}

export async function reports() {
  const { rows } = await safeLeads(2000);
  const projects = await db.list("projects", BRAND, {}, { limit: 2000 });
  const outbox = await db.list("event_outbox", BRAND, {}, { limit: 2000 });
  const by = <T,>(arr: T[], f: (x: T) => unknown) => { const m = new Map<string, number>(); for (const x of arr) { const k = String(f(x) ?? "—"); m.set(k, (m.get(k) ?? 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const d30 = rows.filter((r) => Date.now() - Date.parse(String(r.created_at)) < 30 * 864e5);
  return {
    leads30: d30.length, leadsTotal: rows.length,
    leadsBySource: by(d30, (r) => r.utm_source || (r.gclid ? "google (gclid)" : r.fbclid ? "meta (fbclid)" : "direct/unknown")),
    leadsByService: by(d30.flatMap((r) => (Array.isArray(r.services) ? r.services : [])), (s) => s),
    projectsByStatus: by(projects, (p) => p.status), projectsByService: by(projects, (p) => p.service),
    walkthroughFunnel: { requested: projects.length, started: projects.filter((p) => !["new", "walkthrough_invited"].includes(String(p.status))).length, submitted: projects.filter((p) => Number(p.current_revision_no ?? 0) > 0).length, exported: projects.filter((p) => ["exported", "sent_externally"].includes(String(p.status))).length },
    outboxByStatus: by(outbox, (e) => e.status),
  };
}

export function integrationHealth() {
  const st = integrationStatus();
  const g = ghlStatus();
  const env = (k: string) => Boolean(process.env[k]?.trim());
  const p4durable = storageMode() === "supabase";
  return {
    storage: storageMode(),
    rows: [
      { name: "Phase 4 persistence (Supabase)", state: p4durable ? "configured" : "fallback", detail: p4durable ? "Supabase REST (p4_* tables)" : `Local ${storageMode()} store: not durable on Vercel; walkthrough storage stays blocked in production` },
      { name: "Lead store (Upstash Redis)", state: st.upstash ? "configured" : memoryStoreBlocked() ? "blocked" : "memory (dev/preview)", detail: st.upstash ? "Upstash REST" : "Production lead intake returns 503 until Upstash is set (fail-closed)" },
      { name: "GoHighLevel API v2", state: g.mode === "live" ? "configured" : g.mode, detail: g.mode === "live" ? `Stage ids ${g.stage_ids_set}, workflows ${g.workflows_set}` : "Nothing sent; payloads logged (redacted)" },
      { name: "GHL internal pricing fields", state: flags().ghlInternalPricingFields ? "ON" : "off", detail: "Off = typical range / budget fit / offer guidance are never sent to GHL" },
      { name: "Meta CAPI", state: st.metaCapi ? "configured" : "off", detail: "" },
      { name: "GA4 Measurement Protocol", state: st.ga4 ? "configured" : "off", detail: "" },
      { name: "Team lead brief email (Resend)", state: env("RESEND_API_KEY") && env("LEAD_BRIEF_TO") ? "configured" : "off", detail: "Internal team email only; customers are never emailed by Phase 4 code" },
      { name: "OpenAI Ads CAPI", state: env("OPENAI_ADS_PIXEL_ID") && env("OPENAI_ADS_API_KEY") ? "configured" : "off", detail: "" },
      { name: "Turnstile", state: st.turnstile ? "configured" : "off", detail: "Honeypot + timing + rate limit when off" },
      { name: "Mobile walkthrough", state: flags().walkthrough ? "on" : "off", detail: "PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED; first-party, no vendor; off until privacy/tenancy QA" },
      { name: "Estimator", state: flags().estimator ? "on" : "off", detail: "Manual pricing; price book ships blank" },
    ],
    datamoon: dmStatus(),
    measurement: measurementProviders().map((p) => ({ id: p.id, label: p.label, platform: p.platform, capability: p.capability({}), limits: p.limits })),
    staff: listConfiguredStaff().map((s) => ({ user: s.user, role: s.role, brands: s.brands })),
  };
}
