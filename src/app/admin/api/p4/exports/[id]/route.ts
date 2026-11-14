import { adminRoute, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db, getObject, signedReadUrl, usingSupabase } from "@/lib/p4/db";
import { audit } from "@/lib/p4/audit";

export const runtime = "nodejs";

/** Owner-only private download of an exported proposal. Never public, never emailed. */
export const GET = adminRoute<{ id: string }>("proposal.export", async ({ staff, params }) => {
  const x = await db.get("proposal_exports", BRAND, params.id);
  if (!x) return ajson({ ok: false, error: "Not found" }, 404);
  await audit(BRAND, { actor: staff, action: "proposal.downloaded", target_type: "proposal_export", target_id: x.id });
  if (usingSupabase()) { const u = await signedReadUrl(String(x.storage_path), 120); return u ? Response.redirect(u, 302) : ajson({ ok: false, error: "Unavailable" }, 502); }
  const buf = await getObject(String(x.storage_path));
  if (!buf) return ajson({ ok: false, error: "File missing (ephemeral staging storage)" }, 410);
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": String(x.content_type), "Content-Disposition": `attachment; filename="${String(x.file_name)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
});
