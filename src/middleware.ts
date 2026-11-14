import { NextResponse, type NextRequest } from "next/server";
import { flags } from "@/config/flags";

const PRIVATE = /^\/(api\/|admin(?:\/|$)|portal(?:\/|$)|thank-you(?:\/|$)|lp\/|w\/|walkthrough(?:\/|$))/;
const CAPABILITY = /^\/(w\/|api\/w\/)/;

function hexToBytes(h: string) { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16); return a; }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function pbkdf2Ok(pw: string, stored: string) {
  const [salt, iter, hash] = stored.split(":");
  const n = Number(iter);
  if (!salt || !hash || !Number.isInteger(n) || n < 10000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: n }, key, (hash.length / 2) * 8);
  return safeEqual(Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join(""), hash);
}
const challenge = () => new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="PortfolioWorks admin"' } });

/** /admin gate. Accepts ADMIN_PASSWORD (owner, Phase 2/3) or a staff user from ADMIN_USERS_JSON (PBKDF2-SHA256). */
async function adminGate(req: NextRequest): Promise<NextResponse> {
  const pass = process.env.ADMIN_PASSWORD;
  let users: { user: string; pbkdf2: string }[] = [];
  try { users = JSON.parse(process.env.ADMIN_USERS_JSON || "[]"); } catch { users = []; }
  if (!Array.isArray(users)) users = [];
  if (!pass && !users.length) {
    // Fail closed in production (Phase 3 behaviour). In dev the pages still deny by default (no staff = no permissions).
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ADMIN !== "true") return new NextResponse("Not found", { status: 404 });
    return NextResponse.next();
  }
  const [scheme, enc] = (req.headers.get("authorization") || "").split(" ");
  if (scheme !== "Basic" || !enc) return challenge();
  let decoded = "";
  try { decoded = atob(enc); } catch { decoded = ""; }
  const i = decoded.indexOf(":");
  if (i < 0) return challenge();
  const user = decoded.slice(0, i);
  const pw = decoded.slice(i + 1);
  const rec = users.find((u) => u && u.user === user);
  const ok = rec ? await pbkdf2Ok(pw, String(rec.pbkdf2 || "")) : Boolean(pass) && safeEqual(pw, pass!);
  if (!ok) return challenge();
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * - /admin: Basic auth (owner password or PBKDF2 staff users); 404 in production when nothing is configured.
 *   Pages and admin APIs re-verify the credential and check a role permission (src/lib/p4/auth.ts, deny by default).
 * - Private walkthrough links (/w/<token>): no-store, no referrer, never indexed.
 * - X-Robots-Tag: always noindex private/thank-you/LP/walkthrough routes; staging gets noindex everywhere.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const res = path === "/admin" || path.startsWith("/admin/") ? await adminGate(req) : NextResponse.next();
  if (CAPABILITY.test(path)) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
  }
  if (flags.noindex || PRIVATE.test(path)) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|photos/|llms.txt).*)",
  ],
};
