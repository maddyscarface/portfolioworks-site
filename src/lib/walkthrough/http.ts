import "server-only";
import { NextResponse } from "next/server";
import { BRAND, flags } from "../p4/flags";
import { resolveToken, type Resolved } from "./service";
import { rateLimit } from "../server/ratelimit";

/** Customer responses: private, uncached, never indexed. */
export const PRIVATE_HEADERS = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } as const;
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
/** One generic answer for unknown, expired and revoked links so tokens can't be probed. */
export const linkGone = () => json({ ok: false, error: "This link has expired or is no longer active. Use the contact page or reply to the message that sent you this link and we'll send a new one." }, 404);

export async function withToken(req: Request, token: string, fn: (r: Resolved) => Promise<Response>, limit = 120): Promise<Response> {
  if (!flags().walkthrough) return json({ ok: false, error: "Not available" }, 404);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Separate bucket per action (state/progress/upload/submit…) so heavy uploading can't lock a customer out of submit.
  let bucket = "state";
  try { bucket = new URL(req.url).pathname.split("/").slice(4).filter((s) => !/^(up|med)_/.test(s)).join("/") || "state"; } catch { /* keep default */ }
  if (!rateLimit(`w:${req.method}:${bucket}:${ip}`, limit, 10 * 60_000)) return json({ ok: false, error: "Too many requests. Please wait a minute." }, 429);
  const r = await resolveToken(BRAND, token);
  if (!r) return linkGone();
  try { return await fn(r); } catch (e) { console.error("[walkthrough]", e instanceof Error ? e.message : e); return json({ ok: false, error: "Something went wrong saving that. Please try again." }, 500); }
}

export async function readJson(req: Request, max = 64_000): Promise<unknown> {
  const t = await req.text();
  if (t.length > max) throw new Error("payload too large");
  return t ? JSON.parse(t) : {};
}
