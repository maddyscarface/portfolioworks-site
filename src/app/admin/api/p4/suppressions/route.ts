import { z } from "zod";
import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { addSuppression } from "@/lib/datamoon/service";

export const runtime = "nodejs";

export const GET = adminRoute("suppressions.read", async () => ({ ok: true, suppressions: await db.list("suppressions", BRAND, {}, { limit: 1000 }) }));
const schema = z.object({ email: z.string().email().max(200), reason: z.string().min(2).max(120) });
export const POST = adminRoute("suppressions.write", async ({ req, staff }) => {
  const b = schema.parse(await body(req));
  const row = await addSuppression(BRAND, b.email, b.reason, staff);
  return { ok: true, id: row.id };
});
