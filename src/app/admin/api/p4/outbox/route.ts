import { z } from "zod";
import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { processOutbox, replay } from "@/lib/p4/outbox";
import { outboxHandlers } from "@/lib/p4/handlers";
import { audit } from "@/lib/p4/audit";
import { can, AccessDenied } from "@/lib/p4/rbac";

export const runtime = "nodejs";

export const GET = adminRoute("crm.read", async ({ req }) => {
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.list("event_outbox", BRAND, status ? { status } : {}, { limit: 300 });
  return { ok: true, events: rows.map(({ payload: _p, ...r }) => r) };
});

const act = z.discriminatedUnion("action", [z.object({ action: z.literal("process") }), z.object({ action: z.literal("replay"), id: z.string().max(60) })]);
export const POST = adminRoute("crm.read", async ({ req, staff }) => {
  if (!can(staff, "crm.replay", BRAND)) throw new AccessDenied("crm.replay");
  const b = act.parse(await body(req));
  if (b.action === "process") { const s = await processOutbox(BRAND, outboxHandlers()); await audit(BRAND, { actor: staff, action: "outbox.process", target_type: "outbox", detail: s }); return { ok: true, summary: s }; }
  const r = await replay(BRAND, b.id);
  await audit(BRAND, { actor: staff, action: "outbox.replay", target_type: "outbox", target_id: b.id });
  return r ? { ok: true, status: r.status } : { ok: false, error: "Not found" };
});
