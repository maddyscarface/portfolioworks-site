import { adminRoute } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { verifyAuditChain } from "@/lib/p4/audit";

export const runtime = "nodejs";

export const GET = adminRoute("audit.read", async () => {
  const rows = await db.list("audit_log", BRAND, {}, { limit: 1000, asc: true });
  return { ok: true, chain_ok: verifyAuditChain(rows), entries: rows.reverse() };
});
