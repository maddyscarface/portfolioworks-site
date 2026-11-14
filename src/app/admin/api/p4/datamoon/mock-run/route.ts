import { z } from "zod";
import { adminRoute, body, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { runMockPipeline } from "@/lib/datamoon/service";

export const runtime = "nodejs";
const schema = z.object({ recipe_id: z.string().max(60), scenario: z.enum(["ok", "401", "422", "429", "credits_exhausted", "expired_export", "building"]).default("ok") });

/** Synthetic end-to-end run. No network call is made; all output is labelled SYNTHETIC. */
export const POST = adminRoute("datamoon.import", async ({ req, staff }) => {
  const b = schema.parse(await body(req));
  const r = await runMockPipeline(BRAND, b.recipe_id, staff, b.scenario);
  return r ? { ok: true, synthetic: true, ...r } : ajson({ ok: false, error: "Recipe not found" }, 404);
});
