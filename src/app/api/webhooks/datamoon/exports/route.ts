import { NextResponse } from "next/server";
import { flags } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { enqueue } from "@/lib/p4/outbox";
import { dmKeys, feedBrandMap } from "@/lib/datamoon/config";
import { isUnsignedTest, verifyDataMoonSignature } from "@/lib/datamoon/webhook";

export const runtime = "nodejs";
const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const res = (body: unknown, status: number) => NextResponse.json(body, { status, headers: H });

/**
 * DataMoon intent `export.ready` receiver. Order: flag check → raw body → (unsigned test? ack, never ingest) →
 * HMAC verify (before JSON parse) → dedupe by event id → feed→brand routing (unknown feed rejected) → enqueue → 202.
 * Heavy work (download/import) happens later from the outbox, so we acknowledge well inside the 10 s window.
 */
export async function POST(req: Request) {
  if (!flags().datamoonIntent) return res({ ok: false }, 404);
  const raw = await req.text();
  if (raw.length > 64_000) return res({ ok: false }, 413);
  if (isUnsignedTest(raw, req.headers)) return res({ ok: true, test: true, ingested: false }, 200);
  const v = verifyDataMoonSignature(raw, req.headers, dmKeys().webhookSecret);
  if (!v.ok) return res({ ok: false, error: "invalid signature" }, 401);
  let ev: { id?: string; type?: string; test?: boolean; data?: { export_id?: string; feed_id?: string | null; row_count?: number; download_expires_at?: string } };
  try { ev = JSON.parse(raw); } catch { return res({ ok: false, error: "bad json" }, 400); }
  if (!ev.id || ev.type !== "export.ready" || !ev.data?.export_id) return res({ ok: false, error: "unsupported event" }, 400);
  if (ev.test === true) return res({ ok: true, test: true, ingested: false }, 200);
  const brand = ev.data.feed_id ? feedBrandMap()[ev.data.feed_id] : undefined;
  if (!brand) return res({ ok: false, error: "unknown feed" }, 422);
  const dup = await db.findOne("webhook_events", brand, { event_id: ev.id });
  if (dup) return res({ ok: true, duplicate: true }, 200);
  // Never store the signed download URL (it is a bearer link); the worker requests a fresh one via the API.
  await db.insert("webhook_events", brand, { event_id: ev.id, status: "accepted", provider: "datamoon", type: ev.type, export_id: ev.data.export_id, feed_id: ev.data.feed_id, row_count: ev.data.row_count ?? null, download_expires_at: ev.data.download_expires_at ?? null });
  await enqueue(brand, { type: "audience.run_ready", ref_type: "vendor_export", ref_id: ev.data.export_id, idempotency_key: `dm.export.ready:${ev.id}`, payload: { export_id: ev.data.export_id, feed_id: ev.data.feed_id } });
  return res({ ok: true, accepted: true }, 202);
}
