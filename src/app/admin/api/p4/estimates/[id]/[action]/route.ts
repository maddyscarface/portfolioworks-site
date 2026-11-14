import { adminRoute, body, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { approveInternal, exportProposal, markSentExternally, refreshFromCapture } from "@/lib/estimator/service";

export const runtime = "nodejs";

/** refresh | approve | export | mark-sent. Permission checks happen inside each service call (approve/export are owner-only). */
export const POST = adminRoute<{ id: string; action: string }>("estimate.read", async ({ req, staff, params }) => {
  switch (params.action) {
    case "refresh": await refreshFromCapture(BRAND, params.id, staff); return { ok: true };
    case "approve": return { ok: true, ...(await approveInternal(BRAND, params.id, staff)) };
    case "export": { const out = await exportProposal(BRAND, params.id, staff); return { ok: true, exports: out.map((o) => ({ id: o.id, format: o.format, file_name: o.file_name, href: `/admin/api/p4/exports/${o.id}` })) }; }
    case "mark-sent": await markSentExternally(BRAND, params.id, await body(req), staff); return { ok: true };
    default: return ajson({ ok: false, error: "Unknown action" }, 404);
  }
});
