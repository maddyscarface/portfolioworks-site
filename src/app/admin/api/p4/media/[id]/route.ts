import { adminRoute, ajson } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db, deleteObject, getObject, signedReadUrl, usingSupabase } from "@/lib/p4/db";
import { audit } from "@/lib/p4/audit";
import { can, AccessDenied } from "@/lib/p4/rbac";

export const runtime = "nodejs";

/** Staff-only media access: short-lived signed URL (Supabase) or an authenticated stream (local fallback). */
export const GET = adminRoute<{ id: string }>("media.read", async ({ staff, params }) => {
  const m = await db.get("media_assets", BRAND, params.id);
  if (!m || m.status !== "validated" || !m.storage_path) return ajson({ ok: false, error: "Not found" }, 404);
  // Tenant privacy: a held file (faces, documents or belongings in frame) is visible only to privacy reviewers.
  if (m.privacy_hold && !can(staff, "media.privacy_review", BRAND)) throw new AccessDenied("media.privacy_review");
  await audit(BRAND, { actor: staff, action: "media.viewed", target_type: "media", target_id: m.id });
  if (usingSupabase()) { const u = await signedReadUrl(String(m.storage_path), 300); return u ? Response.redirect(u, 302) : ajson({ ok: false, error: "Unavailable" }, 502); }
  const buf = await getObject(String(m.storage_path));
  if (!buf) return ajson({ ok: false, error: "Not found" }, 404);
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": String(m.mime), "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Content-Disposition": `inline; filename="${String(m.display_name).replace(/[^\w.-]/g, "_")}"`, "X-Content-Type-Options": "nosniff" } });
});

export const DELETE = adminRoute<{ id: string }>("media.read", async ({ staff, params }) => {
  if (!can(staff, "media.delete", BRAND)) throw new AccessDenied("media.delete");
  const m = await db.get("media_assets", BRAND, params.id);
  if (!m) return ajson({ ok: false, error: "Not found" }, 404);
  if (m.storage_path) await deleteObject(String(m.storage_path));
  await db.update("media_assets", BRAND, m.id, { status: "deleted", storage_path: null, deleted_by: staff.user });
  await audit(BRAND, { actor: staff, action: "media.deleted", target_type: "media", target_id: m.id, detail: { project_id: m.project_id } });
  return { ok: true };
});

/** Privacy hold / release (media.privacy_review): hides a file from everyone except privacy reviewers, audit-logged. */
export const PATCH = adminRoute<{ id: string }>("media.privacy_review", async ({ req, staff, params }) => {
  const body = (await req.json().catch(() => ({}))) as { action?: string; reason?: string };
  if (body.action !== "privacy_hold" && body.action !== "privacy_release") return ajson({ ok: false, error: "action must be privacy_hold or privacy_release" }, 400);
  const m = await db.get("media_assets", BRAND, params.id);
  if (!m || m.status === "deleted") return ajson({ ok: false, error: "Not found" }, 404);
  const hold = body.action === "privacy_hold";
  const reason = String(body.reason ?? (hold ? "personal content in frame" : "")).slice(0, 200);
  await db.update("media_assets", BRAND, m.id, { privacy_hold: hold, privacy_reason: hold ? reason : null, privacy_reviewed_by: staff.user, privacy_reviewed_at: new Date().toISOString() });
  await audit(BRAND, { actor: staff, action: hold ? "media.privacy_hold" : "media.privacy_release", target_type: "media", target_id: m.id, detail: { project_id: m.project_id, reason } });
  return { ok: true, privacy_hold: hold };
});
