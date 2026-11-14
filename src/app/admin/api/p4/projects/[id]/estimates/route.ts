import { adminRoute } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { createDraft, staffEstimateView } from "@/lib/estimator/service";

export const runtime = "nodejs";

export const POST = adminRoute<{ id: string }>("estimate.write", async ({ staff, params }) => {
  const est = await createDraft(BRAND, params.id, staff);
  return { ok: true, estimate: staffEstimateView(est, staff, BRAND) };
});
