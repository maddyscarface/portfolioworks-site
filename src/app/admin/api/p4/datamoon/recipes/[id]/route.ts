import { adminRoute, body, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { updateRecipe } from "@/lib/datamoon/service";

export const runtime = "nodejs";

export const PATCH = adminRoute<{ id: string }>("datamoon.read", async ({ req, staff, params }) => {
  const r = await updateRecipe(BRAND, params.id, await body(req), staff);
  return r ? { ok: true, recipe: r } : ajson({ ok: false, error: "Not found" }, 404);
});
