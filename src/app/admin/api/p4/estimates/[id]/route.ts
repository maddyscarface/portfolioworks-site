import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { staffEstimateView, updateEstimate } from "@/lib/estimator/service";

export const runtime = "nodejs";

export const GET = adminRoute<{ id: string }>("estimate.read", async ({ staff, params }) => {
  const e = await db.get("estimates", BRAND, params.id);
  return e ? { ok: true, estimate: staffEstimateView(e, staff, BRAND) } : new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404 });
});

export const PATCH = adminRoute<{ id: string }>("estimate.write", async ({ req, staff, params }) => {
  const e = await updateEstimate(BRAND, params.id, await body(req), staff);
  return { ok: true, estimate: staffEstimateView(e, staff, BRAND) };
});
