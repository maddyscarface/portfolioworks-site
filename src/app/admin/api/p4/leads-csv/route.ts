import { adminRoute } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { can, AccessDenied } from "@/lib/p4/rbac";
import { safeLeads } from "@/lib/p4/admin-data";
import { audit } from "@/lib/p4/audit";

export const runtime = "nodejs";
const COLS = ["id", "created_at", "form_type", "first_name", "last_name", "email", "phone", "town", "zip", "customer_type", "services", "status", "funnel", "lead_score", "utm_source", "utm_medium", "utm_campaign", "ghl_sync_status"];
const cell = (v: unknown) => { let s = Array.isArray(v) ? v.join("|") : v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** First-party leads only (never vendor prospects), CSV-injection safe, audit-logged. Requires leads.export_csv + pii.read. */
export const GET = adminRoute("leads.export_csv", async ({ staff }) => {
  if (!can(staff, "pii.read", BRAND)) throw new AccessDenied("pii.read");
  const { rows } = await safeLeads(5000);
  await audit(BRAND, { actor: staff, action: "leads.export_csv", target_type: "leads", detail: { rows: rows.length } });
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell((r as Record<string, unknown>)[c])).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="portfolioworks-leads-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
});
