import "server-only";
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { AccessDenied, can, isRole, type Permission, type Staff } from "./rbac";
import { BRAND } from "./flags";

/**
 * Staff authentication for /admin and /api/admin/*.
 *
 * - ADMIN_PASSWORD (existing): HTTP Basic, any username → the owner (kept so the Phase 2/3 dashboard keeps working).
 * - ADMIN_USERS_JSON: [{"user":"maria","role":"estimator","brands":["portfolioworks"],"pbkdf2":"<saltHex>:<iterations>:<hashHex>"}]
 *   Hash with: node scripts/hash-admin-password.mjs '<password>'. No plaintext staff passwords in env.
 *
 * The middleware gates the paths; every route handler and admin page re-verifies here (defence in depth) and
 * then checks a specific permission. Nothing is trusted from client-supplied headers.
 */
type StaffRecord = Staff & { pbkdf2: string };

function staffRecords(e = process.env): StaffRecord[] {
  try {
    const arr = JSON.parse(e.ADMIN_USERS_JSON || "[]") as StaffRecord[];
    return Array.isArray(arr) ? arr.filter((s) => s && typeof s.user === "string" && isRole(s.role) && typeof s.pbkdf2 === "string").map((s) => ({ ...s, brands: Array.isArray(s.brands) ? s.brands : [BRAND] })) : [];
  } catch { return []; }
}

const eq = (a: string, b: string) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export function verifyPbkdf2(password: string, stored: string): boolean {
  const [salt, iter, hash] = stored.split(":");
  const n = Number(iter);
  if (!salt || !hash || !Number.isInteger(n) || n < 10000) return false;
  const got = pbkdf2Sync(password, Buffer.from(salt, "hex"), n, hash.length / 2, "sha256").toString("hex");
  return eq(got, hash);
}

export function staffFromAuthorization(header: string | null | undefined, e = process.env): Staff | null {
  if (!header) return null;
  const [scheme, enc] = header.split(" ");
  if (scheme !== "Basic" || !enc) return null;
  let decoded = "";
  try { decoded = Buffer.from(enc, "base64").toString("utf8"); } catch { return null; }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  const user = decoded.slice(0, i);
  const pw = decoded.slice(i + 1);
  const rec = staffRecords(e).find((s) => s.user === user);
  if (rec) return verifyPbkdf2(pw, rec.pbkdf2) ? { user: rec.user, role: rec.role, brands: rec.brands } : null;
  if (e.ADMIN_PASSWORD && eq(pw, e.ADMIN_PASSWORD)) return { user: user || "owner", role: "owner", brands: [BRAND] };
  return null;
}

export function listConfiguredStaff(e = process.env): Staff[] {
  const out: Staff[] = staffRecords(e).map(({ user, role, brands }) => ({ user, role, brands }));
  if (e.ADMIN_PASSWORD) out.unshift({ user: "(ADMIN_PASSWORD)", role: "owner", brands: [BRAND] });
  return out;
}

export class Unauthenticated extends Error { status = 401; constructor() { super("Authentication required"); } }

/** Resolve + authorize. Throws Unauthenticated (401) or AccessDenied (403). */
export function requireStaff(req: { headers: Headers }, perm: Permission, brand: string = BRAND): Staff {
  const staff = staffFromAuthorization(req.headers.get("authorization"));
  if (!staff) throw new Unauthenticated();
  if (!can(staff, perm, brand)) throw new AccessDenied(perm);
  return staff;
}

export function authErrorResponse(e: unknown): Response | null {
  const status = e instanceof Unauthenticated ? 401 : e instanceof AccessDenied ? 403 : 0;
  if (!status) return null;
  return new Response(JSON.stringify({ ok: false, error: status === 401 ? "Authentication required" : "Forbidden" }), {
    status, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow", ...(status === 401 ? { "WWW-Authenticate": 'Basic realm="PortfolioWorks Admin"' } : {}) },
  });
}
