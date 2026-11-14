import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { listPricebook, savePricebook } from "@/lib/estimator/service";

export const runtime = "nodejs";

export const GET = adminRoute("pricebook.read", async ({ staff }) => ({ ok: true, items: await listPricebook(BRAND, staff) }));
export const PUT = adminRoute("pricebook.write", async ({ req, staff }) => ({ ok: true, items: await savePricebook(BRAND, await body(req), staff) }));
