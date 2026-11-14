import "server-only";
import { db, type Row } from "../p4/db";
import { emailHash, newId, nowIso } from "../p4/ids";
import { enqueue } from "../p4/outbox";
import { audit } from "../p4/audit";
import { assertCustomerSafe } from "../p4/leak";
import type { Staff } from "../p4/rbac";
import { TEMPLATES, templateFor, type Step, type WalkthroughService } from "./templates";
import { normalizeProgress, progressSchema, readiness, type Progress } from "./capture";
import { expiresIn, FOLLOWUP_TTL_DAYS, hashToken, INITIAL_TTL_DAYS, newToken, tokenShapeOk } from "./tokens";

export type Customer = { first_name?: string; last_name?: string; email: string; phone?: string; town?: string; zip?: string; address?: string };

export async function createProject(brand: string, input: { lead_id?: string | null; service: WalkthroughService; customer: Customer; source: "website" | "staff"; customer_type?: string; actor: Staff | "system" }) {
  const project = await db.insert("projects", brand, {
    id: newId("prj_"), lead_id: input.lead_id ?? null, service: input.service, status: "new", customer: input.customer, customer_email_hash: emailHash(input.customer.email),
    customer_type: input.customer_type ?? "landlord", source: input.source, current_revision_no: 0, current_revision_id: null, estimate_stale: false, readiness: null, outcome: null,
    assigned_to: null, documents: [], provenance: { customer: input.source === "website" ? "first-party form" : "staff entered" },
  });
  await audit(brand, { actor: input.actor, action: "project.created", target_type: "project", target_id: project.id, detail: { service: input.service, source: input.source } });
  return project;
}

/** Creates a capture session and returns the ONLY copy of the raw token (stored hashed). */
export async function createInvite(brand: string, projectId: string, opts: { kind?: "initial" | "followup"; requested_steps?: string[]; note?: string; actor: Staff | "system" }) {
  const project = await db.get("projects", brand, projectId);
  if (!project) throw new Error("project not found");
  const tpl = templateFor(String(project.service))!;
  const kind = opts.kind ?? "initial";
  const valid = new Set(tpl.steps.map((s) => s.id));
  const picked = (opts.requested_steps ?? []).filter((s) => valid.has(s) && s !== "occupancy" && s !== "privacy");
  if (kind === "followup" && !picked.length) throw new Error("choose at least one step to request");
  // Tenant privacy: every follow-up re-asks occupancy + the privacy promise, because uploads are gated on them.
  const requested = kind === "followup" ? ["occupancy", "privacy", ...picked] : picked;
  const token = newToken();
  const session = await db.insert("capture_sessions", brand, {
    id: newId("ses_"), project_id: projectId, token_hash: hashToken(token), kind, status: "invited", service: project.service, template_revision: tpl.revision,
    expires_at: expiresIn(kind === "followup" ? FOLLOWUP_TTL_DAYS : INITIAL_TTL_DAYS), requested_steps: requested, note: (opts.note ?? "").slice(0, 500),
    progress: null, started_at: null, submitted_at: null, revoked_at: null, created_by: opts.actor === "system" ? "system" : opts.actor.user,
  });
  if (kind === "followup") {
    await db.insert("capture_followups", brand, { project_id: projectId, session_id: session.id, status: "open", requested_steps: requested, note: (opts.note ?? "").slice(0, 500) });
    await db.update("projects", brand, projectId, { status: "followup_requested" });
    await enqueue(brand, { type: "capture.followup.requested", ref_type: "project", ref_id: projectId, idempotency_key: `followup:${session.id}`, payload: { project_id: projectId, steps: requested } });
  } else if (project.status === "new") {
    await db.update("projects", brand, projectId, { status: "walkthrough_invited" });
  }
  await audit(brand, { actor: opts.actor, action: kind === "followup" ? "walkthrough.followup_invite" : "walkthrough.invite", target_type: "capture_session", target_id: session.id, detail: { project_id: projectId } });
  return { token, session };
}

export async function revokeSession(brand: string, sessionId: string, actor: Staff) {
  const s = await db.update("capture_sessions", brand, sessionId, { status: "revoked", revoked_at: nowIso() });
  if (s) await audit(brand, { actor, action: "walkthrough.revoke", target_type: "capture_session", target_id: sessionId });
  return s;
}

export type Resolved = { session: Row; project: Row; editable: boolean };

/** Resolve a customer token. Expired/revoked/unknown → null (same response for all, so tokens can't be probed). */
export async function resolveToken(brand: string, token: unknown): Promise<Resolved | null> {
  if (!tokenShapeOk(token)) return null;
  const session = await db.findOne("capture_sessions", brand, { token_hash: hashToken(token) });
  if (!session || session.status === "revoked") return null;
  if (Date.parse(String(session.expires_at)) < Date.now()) return null;
  const project = await db.get("projects", brand, String(session.project_id));
  if (!project) return null;
  return { session, project, editable: session.status !== "submitted" };
}

const CUSTOMER_STATUS: Record<string, string> = {
  invited: "Not started", in_progress: "In progress", submitted: "Received. Our estimator is reviewing your walkthrough.",
};

/** Customer-safe step shape: internal routing hints (site-check flags) are removed. */
function publicStep(s: Step) {
  if (s.kind === "choice") return { ...s, choices: s.choices.map(({ id, label }) => ({ id, label })) };
  return s;
}

/**
 * The ONLY serializer for customer responses. Explicit allowlist; anything not listed here never leaves the server.
 * assertCustomerSafe() double-checks that no financial key or money-like text slipped in.
 */
export async function publicState(brand: string, r: Resolved, uploadMode: string) {
  const tpl = templateFor(String(r.session.service))!;
  const requested = (r.session.requested_steps as string[]) ?? [];
  const steps = r.session.kind === "followup" ? tpl.steps.filter((s) => requested.includes(s.id)) : tpl.steps;
  const media = (await db.list("media_assets", brand, { session_id: r.session.id }, { asc: true }))
    .filter((m) => m.status === "validated")
    .map((m) => ({ id: m.id, step_id: m.step_id, kind: m.kind, name: m.display_name, uploaded_at: m.created_at }));
  const projectStatus = String(r.project.status);
  const view = {
    ok: true,
    kind: r.session.kind,
    status: r.session.status,
    status_label: projectStatus === "followup_requested" && r.session.kind !== "followup" ? "We've asked for a little more information. Check your email for a follow-up link." : CUSTOMER_STATUS[String(r.session.status)] ?? "In progress",
    service: tpl.id,
    service_label: tpl.label,
    multi_unit: tpl.multiUnit,
    intro: tpl.intro,
    first_name: (r.project.customer as { first_name?: string })?.first_name ?? null,
    steps: steps.map(publicStep),
    note: r.session.kind === "followup" ? r.session.note : null,
    media,
    editable: r.editable,
    can_correct: r.session.status === "submitted",
    submitted_at: r.session.submitted_at ?? null,
    expires_at: r.session.expires_at,
    upload_mode: uploadMode,
  };
  // The customer's own draft is echoed back as typed (it may contain their own notes); everything else is checked.
  return { ...assertCustomerSafe(view, "walkthrough public state"), progress: r.session.progress ?? null };
}

export async function saveProgress(brand: string, r: Resolved, body: unknown) {
  if (!r.editable) return { ok: false as const, error: "This walkthrough was already submitted. Use “Add a correction” instead." };
  const p = progressSchema.safeParse(body);
  if (!p.success) return { ok: false as const, error: "Please check your answers." };
  const first = !r.session.started_at;
  await db.update("capture_sessions", brand, r.session.id, { progress: p.data, status: "in_progress", ...(first ? { started_at: nowIso() } : {}) });
  if (first) {
    if (["new", "walkthrough_invited"].includes(String(r.project.status))) await db.update("projects", brand, String(r.project.id), { status: "capture_in_progress" });
    await enqueue(brand, { type: "capture.started", ref_type: "project", ref_id: String(r.project.id), idempotency_key: `capture.started:${r.session.id}`, payload: { project_id: r.project.id } });
  }
  return { ok: true as const };
}

async function mediaCounts(brand: string, projectId: string) {
  const counts: Record<string, number> = {};
  for (const m of await db.list("media_assets", brand, { project_id: projectId })) if (m.status === "validated") counts[String(m.step_id)] = (counts[String(m.step_id)] ?? 0) + 1;
  return counts;
}

/** Writes a new immutable measurement revision and marks any existing estimate stale. */
export async function recordRevision(brand: string, projectId: string, sessionId: string | null, progress: Progress, reason: "submit" | "correction" | "followup" | "staff_entry", actor: string) {
  const project = await db.get("projects", brand, projectId);
  if (!project) throw new Error("project not found");
  const tpl = templateFor(String(project.service))!;
  // Merge with the previous revision so a follow-up that covers only some steps doesn't erase earlier answers.
  const prev = project.current_revision_id ? await db.get("measurement_revisions", brand, String(project.current_revision_id)) : null;
  const merged: Progress = prev ? mergeProgress(prev.progress as Progress, progress) : progress;
  const normalized = normalizeProgress(tpl, merged);
  const no = Number(project.current_revision_no ?? 0) + 1;
  const rev = await db.insert("measurement_revisions", brand, { id: newId("rev_"), project_id: projectId, session_id: sessionId, revision: no, reason, actor, progress: merged, normalized, template_revision: tpl.revision });
  const ready = readiness(String(project.service), normalized, await mediaCounts(brand, projectId));
  const estimates = await db.list("estimates", brand, { project_id: projectId });
  for (const e of estimates) if (!["superseded"].includes(String(e.status)) && Number(e.capture_revision_no) !== no) await db.update("estimates", brand, e.id, { stale: true, stale_reason: `capture revision ${no} (${reason})` });
  await db.update("projects", brand, projectId, { current_revision_no: no, current_revision_id: rev.id, readiness: ready, estimate_stale: estimates.length > 0 });
  return { rev, ready };
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  return {
    answers: { ...(a?.answers ?? {}), ...(b.answers ?? {}) },
    footprint: b.footprint?.length ? b.footprint : a?.footprint ?? [],
    measures: { ...(a?.measures ?? {}), ...(b.measures ?? {}) },
    assist_requested: Boolean(b.assist_requested ?? a?.assist_requested),
    correction_note: b.correction_note,
  };
}

export async function submitSession(brand: string, r: Resolved) {
  if (!r.editable) return { ok: true as const, duplicate: true };
  const progress = progressSchema.parse(r.session.progress ?? {});
  const reason = r.session.kind === "followup" ? "followup" : "submit";
  const { rev } = await recordRevision(brand, String(r.project.id), r.session.id, progress, reason, "customer");
  await db.update("capture_sessions", brand, r.session.id, { status: "submitted", submitted_at: nowIso() });
  if (r.session.kind === "followup") for (const f of await db.list("capture_followups", brand, { session_id: r.session.id })) await db.update("capture_followups", brand, f.id, { status: "answered" });
  await db.update("projects", brand, String(r.project.id), { status: "walkthrough_submitted" });
  await enqueue(brand, { type: "capture.submitted", ref_type: "project", ref_id: String(r.project.id), idempotency_key: `capture.submitted:${r.session.id}`, payload: { project_id: r.project.id, lead_id: r.project.lead_id, service: r.project.service, revision: rev.revision } });
  await audit(brand, { actor: "customer", action: "walkthrough.submitted", target_type: "capture_session", target_id: r.session.id, detail: { project_id: r.project.id, revision: rev.revision } });
  return { ok: true as const, duplicate: false };
}

export async function correctSubmitted(brand: string, r: Resolved, body: unknown) {
  if (r.session.status !== "submitted") return { ok: false as const, error: "Submit the walkthrough first." };
  const p = progressSchema.safeParse(body);
  if (!p.success || (!p.data.correction_note && !Object.keys(p.data.measures).length && !p.data.footprint.length && !Object.keys(p.data.answers).length)) return { ok: false as const, error: "Add the corrected value or a short note." };
  const { rev } = await recordRevision(brand, String(r.project.id), r.session.id, p.data, "correction", "customer");
  await enqueue(brand, { type: "capture.corrected", ref_type: "project", ref_id: String(r.project.id), idempotency_key: `capture.corrected:${rev.id}`, payload: { project_id: r.project.id, revision: rev.revision } });
  await audit(brand, { actor: "customer", action: "walkthrough.corrected", target_type: "project", target_id: String(r.project.id), detail: { revision: rev.revision } });
  return { ok: true as const };
}

export { serviceChoices } from "./choices";
