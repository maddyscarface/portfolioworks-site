import { adminRoute } from "@/lib/p4/admin-api";
import { projectDetail } from "@/lib/p4/admin-data";

export const runtime = "nodejs";

export const GET = adminRoute<{ id: string }>("projects.read", async ({ staff, params }) => {
  const d = await projectDetail(params.id, staff);
  return d ? { ok: true, ...d } : new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404 });
});
