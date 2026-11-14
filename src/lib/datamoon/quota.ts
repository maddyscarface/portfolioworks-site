import type { Recipe } from "./recipes";

/** Credit / budget guard checked immediately before any billable call (export create, audience build, enrichment). */
export function quotaGuard(r: Pick<Recipe, "max_records" | "approvals">, ctx: { remainingCredits: number | null; usedThisMonth: number; limits: { maxRecordsPerRun: number; monthlyRecordCeiling: number; budgetApproved: boolean } }) {
  const reasons: string[] = [];
  if (!ctx.limits.budgetApproved) reasons.push("owner budget not approved (DATAMOON_BUDGET_APPROVED)");
  if (ctx.limits.maxRecordsPerRun <= 0) reasons.push("per-run record ceiling is 0");
  if (r.max_records > ctx.limits.maxRecordsPerRun) reasons.push(`recipe asks for ${r.max_records} records; per-run ceiling is ${ctx.limits.maxRecordsPerRun}`);
  if (ctx.usedThisMonth + r.max_records > ctx.limits.monthlyRecordCeiling) reasons.push(`monthly ceiling ${ctx.limits.monthlyRecordCeiling} would be exceeded`);
  if (ctx.remainingCredits !== null && ctx.remainingCredits < r.max_records) reasons.push(`only ${ctx.remainingCredits} vendor credits remain`);
  if (!r.approvals.export) reasons.push("export approval missing");
  return { ok: reasons.length === 0, reasons };
}
