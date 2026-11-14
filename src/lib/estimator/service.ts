import "server-only";
import { z } from "zod";
import { BUCKETS, db, putObject, type Row } from "../p4/db";
import { newId, nowIso } from "../p4/ids";
import { audit } from "../p4/audit";
import { enqueue } from "../p4/outbox";
import { AccessDenied, can, type Staff } from "../p4/rbac";
import { site } from "@/config/site";
import { OUTCOMES } from "../walkthrough/capture";
import { compute, draftFromCapture, EMPTY_ADJ, LINE_CATEGORIES, snapshotHash, type Adjustments, type Line, type ScopeItem } from "./model";
import { renderDocx, renderPdf, type ProposalDoc } from "./documents";

export class EstimateError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const need = (staff: Staff, perm: Parameters<typeof can>[1], brand: string) => { if (!can(staff, perm, brand)) throw new AccessDenied(perm); };

const money = z.number().finite().min(0).max(10_000_000).nullable();
export const estimatePatchSchema = z.object({
  outcome: z.enum(OUTCOMES).optional(),
  scope: z.array(z.object({ id: z.string().max(40), description: z.string().max(200), quantity: z.number().finite().min(0).max(1e6).nullable(), unit: z.string().max(20), source: z.enum(["customer_tape", "staff_verified", "staff_entered"]), measurement_ref: z.string().max(40).optional() })).max(60).optional(),
  lines: z.array(z.object({ id: z.string().max(40), category: z.enum(LINE_CATEGORIES), description: z.string().max(200), quantity: z.number().finite().min(0).max(1e6).nullable(), unit: z.string().max(20), rate: money, rate_source: z.enum(["manual", "pricebook"]).nullable(), notes: z.string().max(300).optional() })).max(80).optional(),
  adjustments: z.object({ minimum: money, mobilization: money, waste_pct: z.number().min(0).max(100).nullable(), tax_pct: z.number().min(0).max(30).nullable(), margin_pct: z.number().min(0).max(300).nullable() }).optional(),
  customer_scope_text: z.string().max(4000).optional(),
  exclusions: z.string().max(4000).optional(),
  notes_internal: z.string().max(4000).optional(),
  expected_version: z.number().int().min(0),
});

/** Staff view of an estimate: margin fields are removed for anyone without estimate.margin.read. */
export function staffEstimateView(e: Row, staff: Staff, brand: string) {
  const showMargin = can(staff, "estimate.margin.read", brand);
  const adj = { ...(e.adjustments as Adjustments) };
  const calc = compute(e.lines as Line[], adj);
  if (!showMargin) {
    delete (adj as Partial<Adjustments>).margin_pct;
    if (calc.complete) { const c = calc as Record<string, unknown>; delete c.margin_amount; delete c.cost; }
  }
  return { ...e, adjustments: adj, calc, can_see_margin: showMargin } as Row & { adjustments: Adjustments; calc: ReturnType<typeof compute>; can_see_margin: boolean };
}

export async function createDraft(brand: string, projectId: string, staff: Staff) {
  need(staff, "estimate.write", brand);
  const project = await db.get("projects", brand, projectId);
  if (!project) throw new EstimateError(404, "project not found");
  const prior = await db.list("estimates", brand, { project_id: projectId });
  const rev = project.current_revision_id ? await db.get("measurement_revisions", brand, String(project.current_revision_id)) : null;
  const { scope, lines } = draftFromCapture(String(project.service), (rev?.normalized as never) ?? null);
  for (const p of prior) if (!["superseded", "marked_sent"].includes(String(p.status))) await db.update("estimates", brand, p.id, { status: "superseded" });
  const est = await db.insert("estimates", brand, {
    id: newId("est_"), project_id: projectId, status: "draft", revision: prior.length + 1, version: 0, stale: false, capture_revision_no: Number(project.current_revision_no ?? 0),
    outcome: (project.readiness as { outcome?: string } | null)?.outcome ?? null, scope, lines, adjustments: EMPTY_ADJ,
    customer_scope_text: "", exclusions: "Permits, engineering, HOA fees and concealed conditions are excluded unless listed above.", notes_internal: "",
    created_by: staff.user, updated_by: staff.user, approved_by: null, approved_at: null, approved_hash: null,
  });
  await db.update("projects", brand, projectId, { status: "estimate_draft", estimate_stale: false });
  await enqueue(brand, { type: "estimate.draft_created", ref_type: "project", ref_id: projectId, idempotency_key: `estimate.draft:${est.id}`, payload: { project_id: projectId, estimate_revision: est.revision } });
  await audit(brand, { actor: staff, action: "estimate.draft_created", target_type: "estimate", target_id: est.id, detail: { project_id: projectId } });
  return est;
}

export async function updateEstimate(brand: string, id: string, body: unknown, staff: Staff) {
  need(staff, "estimate.write", brand);
  const p = estimatePatchSchema.safeParse(body);
  if (!p.success) throw new EstimateError(422, "Invalid estimate fields");
  const est = await db.get("estimates", brand, id);
  if (!est) throw new EstimateError(404, "estimate not found");
  if (["superseded", "marked_sent"].includes(String(est.status))) throw new EstimateError(409, "This estimate revision is closed. Create a new draft.");
  if (Number(est.version) !== p.data.expected_version) throw new EstimateError(409, "Someone else saved this estimate. Reload to see the latest version.");
  const { expected_version: _v, ...patch } = p.data;
  if (patch.adjustments && !can(staff, "estimate.margin.read", brand)) patch.adjustments = { ...patch.adjustments, margin_pct: (est.adjustments as Adjustments).margin_pct };
  const changed = { ...patch, version: Number(est.version) + 1, updated_by: staff.user };
  // Any edit after internal approval returns it to draft: approvals cover an exact snapshot.
  const wasApproved = ["approved_internal", "exported"].includes(String(est.status));
  const next = await db.update("estimates", brand, id, { ...changed, ...(wasApproved ? { status: "draft", approved_by: null, approved_at: null, approved_hash: null } : {}) });
  await audit(brand, { actor: staff, action: wasApproved ? "estimate.edited_after_approval" : "estimate.updated", target_type: "estimate", target_id: id, detail: { fields: Object.keys(patch).join(",") } });
  return next!;
}

/** Re-base the estimate on the latest capture revision (clears the stale flag; quantities stay staff-controlled). */
export async function refreshFromCapture(brand: string, id: string, staff: Staff) {
  need(staff, "estimate.write", brand);
  const est = await db.get("estimates", brand, id);
  if (!est) throw new EstimateError(404, "estimate not found");
  const project = await db.get("projects", brand, String(est.project_id));
  await db.update("estimates", brand, id, { stale: false, stale_reason: null, capture_revision_no: Number(project?.current_revision_no ?? 0), version: Number(est.version) + 1, status: "draft", approved_hash: null, approved_by: null, approved_at: null });
  await db.update("projects", brand, String(est.project_id), { estimate_stale: false });
  await audit(brand, { actor: staff, action: "estimate.rebased", target_type: "estimate", target_id: id, detail: { capture_revision: project?.current_revision_no } });
}

async function assertFresh(brand: string, est: Row) {
  const project = await db.get("projects", brand, String(est.project_id));
  if (!project) throw new EstimateError(404, "project not found");
  if (est.stale || Number(est.capture_revision_no) !== Number(project.current_revision_no ?? 0)) throw new EstimateError(409, "The customer's walkthrough changed after this draft. Review the new revision, then refresh the estimate.");
  return project;
}

export async function approveInternal(brand: string, id: string, staff: Staff) {
  need(staff, "proposal.approve", brand);
  const est = await db.get("estimates", brand, id);
  if (!est) throw new EstimateError(404, "estimate not found");
  await assertFresh(brand, est);
  const calc = compute(est.lines as Line[], est.adjustments as Adjustments);
  if (!calc.complete) throw new EstimateError(422, `Cannot approve: ${calc.reason}. Missing rates are never estimated automatically.`);
  const hash = snapshotHash(est as never);
  await db.update("estimates", brand, id, { status: "approved_internal", approved_by: staff.user, approved_at: nowIso(), approved_hash: hash });
  await db.update("projects", brand, String(est.project_id), { status: "approved_internal" });
  await enqueue(brand, { type: "estimate.approved_internal", ref_type: "project", ref_id: String(est.project_id), idempotency_key: `estimate.approved:${id}:${hash.slice(0, 16)}`, payload: { project_id: est.project_id } });
  await audit(brand, { actor: staff, action: "estimate.approved_internal", target_type: "estimate", target_id: id, detail: { snapshot: hash.slice(0, 16) } });
  return { hash };
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildProposal(project: Row, est: Row): ProposalDoc {
  const calc = compute(est.lines as Line[], est.adjustments as Adjustments);
  if (!calc.complete) throw new EstimateError(422, "Estimate incomplete");
  const c = project.customer as { first_name?: string; last_name?: string; town?: string; zip?: string };
  const scope = (est.scope as ScopeItem[]).map((s) => ({ description: s.description, quantity: s.quantity === null ? "To be confirmed" : `${s.quantity} ${s.unit}` }));
  return {
    title: "Proposal (owner-approved draft for delivery)", brand: site.name, email: site.email,
    preparedFor: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Customer", location: [c.town, c.zip].filter(Boolean).join(", ") || "On file",
    date: new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" }),
    reference: `${String(project.id).slice(-6).toUpperCase()}-R${est.revision}`,
    scope, scopeText: String(est.customer_scope_text || "Scope as described below, based on the customer's walkthrough and measurements."), exclusions: String(est.exclusions || ""),
    priceLines: [{ label: "Project price", amount: usd(calc.before_tax) }, ...(calc.tax ? [{ label: "Tax", amount: usd(calc.tax) }] : []), { label: "Total", amount: usd(calc.total) }],
    footer: ["Quantities are based on the customer's tape measurements unless marked as verified on site.", "Terms, schedule and payment details: to be added by PortfolioWorks before delivery. Access to occupied units only by arrangement through the owner or manager.", "This document was exported privately for owner review. It has not been sent by the website."],
  };
}

export async function exportProposal(brand: string, id: string, staff: Staff) {
  need(staff, "proposal.export", brand);
  const est = await db.get("estimates", brand, id);
  if (!est) throw new EstimateError(404, "estimate not found");
  if (!["approved_internal", "exported"].includes(String(est.status))) throw new EstimateError(409, "Approve the estimate internally before exporting.");
  const project = await assertFresh(brand, est);
  if (snapshotHash(est as never) !== est.approved_hash) throw new EstimateError(409, "The estimate changed after approval. Approve it again before exporting.");
  const doc = buildProposal(project, est);
  const stamp = Date.now();
  const out: Row[] = [];
  for (const [format, bytes, type] of [["docx", renderDocx(doc), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["pdf", renderPdf(doc), "application/pdf"]] as const) {
    const path = await putObject(BUCKETS.exports, `${brand}/${project.id}/${est.id}-${stamp}.${format}`, bytes, type);
    out.push(await db.insert("proposal_exports", brand, { id: newId("exp_"), project_id: project.id, estimate_id: est.id, format, storage_path: path, content_type: type, size: bytes.length, snapshot_hash: est.approved_hash, created_by: staff.user, file_name: `PortfolioWorks-proposal-${doc.reference}.${format}` }));
  }
  await db.update("estimates", brand, id, { status: "exported" });
  await db.update("projects", brand, String(project.id), { status: "exported" });
  await enqueue(brand, { type: "proposal.exported", ref_type: "project", ref_id: String(project.id), idempotency_key: `proposal.exported:${id}:${stamp}`, payload: { project_id: project.id, formats: ["docx", "pdf"] } });
  await audit(brand, { actor: staff, action: "proposal.exported", target_type: "estimate", target_id: id, detail: { exports: out.map((o) => o.id).join(",") } });
  return out;
}

export const markSentSchema = z.object({ channel: z.enum(["email", "in_person", "mail", "portal", "other"]), sent_at: z.string().datetime().optional(), note: z.string().max(300).optional() });

/** Records that the OWNER delivered the proposal outside this system. The website never sends proposals. */
export async function markSentExternally(brand: string, id: string, body: unknown, staff: Staff) {
  need(staff, "proposal.mark_sent", brand);
  const p = markSentSchema.safeParse(body);
  if (!p.success) throw new EstimateError(422, "Choose how it was sent");
  const est = await db.get("estimates", brand, id);
  if (!est || est.status !== "exported") throw new EstimateError(409, "Export the approved proposal first.");
  const at = p.data.sent_at ?? nowIso();
  await db.update("estimates", brand, id, { status: "marked_sent", sent_channel: p.data.channel, sent_at: at, sent_note: p.data.note ?? "", sent_recorded_by: staff.user });
  await db.update("projects", brand, String(est.project_id), { status: "sent_externally" });
  await enqueue(brand, { type: "proposal.marked_sent_externally", ref_type: "project", ref_id: String(est.project_id), idempotency_key: `proposal.sent:${id}`, payload: { project_id: est.project_id, channel: p.data.channel, sent_at: at } });
  await audit(brand, { actor: staff, action: "proposal.marked_sent_externally", target_type: "estimate", target_id: id, detail: { channel: p.data.channel } });
}

// ---------- owner-only price book (ships blank) ----------
export const pricebookSchema = z.object({ items: z.array(z.object({ id: z.string().max(40).optional(), category: z.enum(LINE_CATEGORIES), description: z.string().max(200), unit: z.string().max(20), rate: money, approved: z.boolean() })).max(200) });

export async function listPricebook(brand: string, staff: Staff) {
  need(staff, "pricebook.read", brand);
  return db.list("pricebook_items", brand, {}, { asc: true });
}
export async function savePricebook(brand: string, body: unknown, staff: Staff) {
  need(staff, "pricebook.write", brand);
  const p = pricebookSchema.safeParse(body);
  if (!p.success) throw new EstimateError(422, "Invalid price book");
  const existing = await db.list("pricebook_items", brand, {});
  for (const it of p.data.items) {
    const row = { category: it.category, description: it.description, unit: it.unit, rate: it.rate, status: it.approved && it.rate !== null ? "approved" : "draft", approved_by: it.approved ? staff.user : null };
    if (it.id && existing.some((e) => e.id === it.id)) await db.update("pricebook_items", brand, it.id, row); else await db.insert("pricebook_items", brand, row);
  }
  await audit(brand, { actor: staff, action: "pricebook.saved", target_type: "pricebook", detail: { items: p.data.items.length } });
}
