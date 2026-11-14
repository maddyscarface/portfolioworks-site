import { z } from "zod";
import { adminRoute, body, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { approveRecipe } from "@/lib/datamoon/service";

export const runtime = "nodejs";
const schema = z.object({ kind: z.enum(["legal", "export", "crm_sync"]) });

/** Records an approval only. Approval never triggers a live call; activation also needs flags, keys and budget. */
export const POST = adminRoute<{ id: string }>("datamoon.read", async ({ req, staff, params }) => {
  const r = await approveRecipe(BRAND, params.id, schema.parse(await body(req)).kind, staff);
  return r ? { ok: true, ...r } : ajson({ ok: false, error: "Not found" }, 404);
});
