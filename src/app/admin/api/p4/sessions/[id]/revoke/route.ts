import { adminRoute } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { revokeSession } from "@/lib/walkthrough/service";

export const runtime = "nodejs";

export const POST = adminRoute<{ id: string }>("walkthrough.invite", async ({ staff, params }) => {
  const s = await revokeSession(BRAND, params.id, staff);
  return s ? { ok: true } : new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404 });
});
