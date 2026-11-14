import { adminRoute } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { listRecipes, liveActivationBlockers } from "@/lib/datamoon/service";

export const runtime = "nodejs";

export const GET = adminRoute("datamoon.read", async () => ({ ok: true, recipes: (await listRecipes(BRAND)).map((r) => ({ ...r, live_blockers: liveActivationBlockers(r.recipe) })) }));
