import "server-only";
import { z } from "zod";
import { db, type Row } from "../p4/db";
import { emailHash, newId, nowIso } from "../p4/ids";
import { audit } from "../p4/audit";
import { enqueue } from "../p4/outbox";
import { can, AccessDenied, type Staff, type Permission } from "../p4/rbac";
import { activationIssues, PW_RECIPES, recipeSchema, DESTINATIONS, type Recipe } from "./recipes";
import { importCsv } from "./importer";
import { mockAdapter, type Scenario } from "./adapter";
import { quotaGuard } from "./quota";
import { dmLimits } from "./config";
import { flags } from "../p4/flags";
import { SYNTHETIC_LABEL } from "./fixtures";

const need = (s: Staff, p: Permission, brand: string) => { if (!can(s, p, brand)) throw new AccessDenied(p); };

export async function listRecipes(brand: string) {
  let rows = await db.list("audience_recipes", brand, {}, { asc: true });
  if (!rows.length) {
    for (const r of PW_RECIPES) await db.insert("audience_recipes", brand, { id: r.id, name: r.name, status: r.status, persona: r.persona, recipe: r });
    rows = await db.list("audience_recipes", brand, {}, { asc: true });
  }
  return rows.map((row) => { const r = row.recipe as Recipe; return { id: row.id, recipe: r, issues: activationIssues(r) }; });
}

const editable = z.object({
  name: z.string().min(3).max(120).optional(), max_records: z.number().int().min(0).max(1_000_000).optional(), lookback_days: z.number().int().min(1).max(90).optional(),
  purpose: z.string().min(10).max(500).optional(), legal_basis: z.string().max(300).optional(), approved_destinations: z.array(z.enum(DESTINATIONS)).max(4).optional(),
  zips: z.array(z.string().regex(/^\d{5}$/)).max(400).optional(),
});

export async function updateRecipe(brand: string, id: string, body: unknown, staff: Staff) {
  need(staff, "datamoon.recipe.write", brand);
  const row = await db.get("audience_recipes", brand, id);
  if (!row) return null;
  const p = editable.parse(body);
  const cur = row.recipe as Recipe;
  const next: Recipe = recipeSchema.parse({ ...cur, ...p, zips: undefined, geography: p.zips ? { ...cur.geography, zips: p.zips } : cur.geography, approvals: { legal: null, export: null, crm_sync: null }, status: "draft" });
  await db.update("audience_recipes", brand, id, { name: next.name, status: next.status, recipe: next });
  await audit(brand, { actor: staff, action: "datamoon.recipe.updated", target_type: "audience_recipe", target_id: id, detail: { fields: Object.keys(p), approvals_reset: true } });
  return next;
}

const APPROVAL_PERM = { legal: "datamoon.recipe.approve_legal", export: "datamoon.recipe.approve_export", crm_sync: "datamoon.recipe.approve_crm" } as const;
export async function approveRecipe(brand: string, id: string, kind: keyof typeof APPROVAL_PERM, staff: Staff) {
  need(staff, APPROVAL_PERM[kind], brand);
  const row = await db.get("audience_recipes", brand, id);
  if (!row) return null;
  const r = row.recipe as Recipe;
  if (kind !== "legal" && !r.approvals.legal) throw new AccessDenied("legal approval must come first");
  const next = { ...r, approvals: { ...r.approvals, [kind]: `${staff.user}@${nowIso()}` } } as Recipe;
  next.status = next.approvals.legal && next.approvals.export ? "approved" : "pending_approval";
  await db.update("audience_recipes", brand, id, { recipe: next, status: next.status });
  await audit(brand, { actor: staff, action: `datamoon.recipe.approve_${kind}`, target_type: "audience_recipe", target_id: id });
  if (next.status === "approved") await enqueue(brand, { type: "audience.recipe_approved", ref_type: "audience_recipe", ref_id: id, idempotency_key: `recipe.approved:${id}:${next.approvals.export}` });
  return { recipe: next, issues: activationIssues(next) };
}

/** Commit an export CSV into the vendor prospect table (never into leads). */
export async function importExport(brand: string, opts: { csv: string; recipeId: string; runId: string; synthetic: boolean; dryRun: boolean; actor: Staff | "system" }) {
  const existing = await db.list("vendor_contacts", brand, {}, { limit: 5000 });
  const supp = await db.list("suppressions", brand, {}, { limit: 5000 });
  const firstParty = await db.list("projects", brand, {}, { limit: 5000 });
  const res = importCsv(opts.csv, {
    suppressedHashes: new Set(supp.map((s) => String(s.email_hash))), existingContactIds: new Set(existing.map((c) => String(c.contact_id))),
    existingEmailHashes: new Set(existing.map((c) => String(c.email_hash ?? "")).filter(Boolean)), firstPartyEmailHashes: new Set(firstParty.map((p) => String(p.customer_email_hash ?? "")).filter(Boolean)),
  });
  if (opts.dryRun) return { ...res, committed: 0 };
  let committed = 0;
  for (const c of res.accepted) {
    const row = await db.insert("vendor_contacts", brand, { ...c, id: newId("vc_"), recipe_id: opts.recipeId, run_id: opts.runId, synthetic: opts.synthetic, source: "datamoon", imported_at: nowIso() });
    committed++;
    if (c.status !== "suppressed") await enqueue(brand, { type: "crm.sync", ref_type: "vendor_contact", ref_id: row.id, idempotency_key: `crm.sync:vc:${c.contact_id}`, payload: { synthetic: opts.synthetic } });
  }
  await enqueue(brand, { type: "audience.export_imported", ref_type: "audience_run", ref_id: opts.runId, idempotency_key: `imported:${opts.runId}`, payload: { committed, rejected: res.rejected.length, duplicates: res.duplicates.length, suppressed: res.suppressed.length } });
  await audit(brand, { actor: opts.actor, action: "datamoon.import", target_type: "audience_run", target_id: opts.runId, detail: { committed, rejected: res.rejected.length, duplicates: res.duplicates.length, suppressed: res.suppressed.length, synthetic: opts.synthetic } });
  return { ...res, committed };
}

/**
 * MOCK pipeline run (no network): recipe → quota guard (demo limits) → create export → poll → download → import.
 * Everything is labelled synthetic. Used to prove the flow end-to-end before any key is purchased.
 */
export async function runMockPipeline(brand: string, recipeId: string, staff: Staff, scenario: Scenario = "ok") {
  need(staff, "datamoon.import", brand);
  const rec = (await listRecipes(brand)).find((r) => r.id === recipeId);
  if (!rec) return null;
  const a = mockAdapter(scenario);
  const run = await db.insert("audience_runs", brand, { id: newId("run_"), recipe_id: recipeId, status: "started", mode: "mock", synthetic: true, label: SYNTHETIC_LABEL, scenario });
  await enqueue(brand, { type: "audience.run_started", ref_type: "audience_run", ref_id: run.id, idempotency_key: `run.started:${run.id}`, payload: { synthetic: true } });
  const steps: { step: string; ok: boolean; detail: string }[] = [];
  try {
    const credits = await a.getCredits();
    const guard = quotaGuard({ max_records: 6, approvals: { ...rec.recipe.approvals, export: "demo" } }, { remainingCredits: credits.remaining, usedThisMonth: 0, limits: { maxRecordsPerRun: 10, monthlyRecordCeiling: 10, budgetApproved: true } });
    steps.push({ step: "quota guard (demo limits)", ok: guard.ok, detail: guard.ok ? `remaining ${credits.remaining} synthetic credits` : guard.reasons.join("; ") });
    const job = await a.createExport("synthetic-feed", { lookback_days: 7, max_rows: 6, page_size: 1000 });
    steps.push({ step: "create export", ok: true, detail: job.export_id });
    const polled = await a.pollExport(job.export_id);
    steps.push({ step: "poll export", ok: polled.status === "ready", detail: polled.status });
    if (polled.status !== "ready") throw new Error(`export ${polled.status}`);
    const { csv } = await a.downloadExport(job.export_id);
    const imp = await importExport(brand, { csv, recipeId, runId: run.id, synthetic: true, dryRun: false, actor: staff });
    steps.push({ step: "import", ok: true, detail: `${imp.committed} committed, ${imp.rejected.length} rejected, ${imp.duplicates.length} duplicate, ${imp.suppressed.length} suppressed` });
    await db.update("audience_runs", brand, run.id, { status: "imported", steps });
    return { run_id: run.id, steps, import: { committed: imp.committed, rejected: imp.rejected, duplicates: imp.duplicates, suppressed: imp.suppressed } };
  } catch (err) {
    steps.push({ step: "error", ok: false, detail: err instanceof Error ? err.message : String(err) });
    await db.update("audience_runs", brand, run.id, { status: "failed", steps });
    await enqueue(brand, { type: "audience.sync_failed", ref_type: "audience_run", ref_id: run.id, idempotency_key: `run.failed:${run.id}` });
    return { run_id: run.id, steps, import: null };
  }
}

/** Live activation gate. Always refuses in Phase 4 unless every flag, approval and budget ceiling is in place. */
export function liveActivationBlockers(r: Recipe, e = process.env) {
  const f = flags(e); const out = [...activationIssues(r)];
  if (!f.datamoonActivation) out.unshift("DATAMOON_AUDIENCE_ACTIVATION_PORTFOLIOWORKS is off");
  const q = quotaGuard(r, { remainingCredits: null, usedThisMonth: 0, limits: dmLimits(e) });
  out.push(...q.reasons);
  return [...new Set(out)];
}

export async function addSuppression(brand: string, email: string, reason: string, actor: Staff | "customer" | "system") {
  const h = emailHash(email);
  if (!h) throw new Error("email required");
  const exists = await db.findOne("suppressions", brand, { email_hash: h });
  if (exists) return exists;
  const row = await db.insert("suppressions", brand, { email_hash: h, reason: reason.slice(0, 120), source: actor === "customer" ? "customer" : actor === "system" ? "system" : "staff" });
  await audit(brand, { actor, action: "suppression.added", target_type: "suppression", target_id: row.id, detail: { reason: reason.slice(0, 120) } });
  await enqueue(brand, { type: "audience.suppression_applied", ref_type: "suppression", ref_id: row.id, idempotency_key: `supp:${h}` });
  // Mark matching vendor prospects suppressed so they can never sync.
  for (const vc of await db.list("vendor_contacts", brand, { email_hash: h })) await db.update("vendor_contacts", brand, vc.id, { status: "suppressed" });
  return row;
}

export type { Row };
