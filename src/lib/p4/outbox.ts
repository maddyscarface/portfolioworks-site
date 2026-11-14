import "server-only";
import { db, type Row } from "./db";
import { newId, nowIso } from "./ids";
import { findFinancialLeaks } from "./leak";

/**
 * Durable event outbox. Every first-party and audience-ops event is written here before any external call, so a GHL
 * or vendor outage never discards a lead. A worker (cron or "Process now" in the admin) delivers pending events
 * with exponential backoff; after MAX_ATTEMPTS the event moves to `dead` (DLQ) and can be replayed by staff.
 */
export const EVENT_TYPES = [
  "lead.created", "walkthrough.requested", "capture.started", "capture.submitted", "capture.followup.requested", "capture.corrected",
  "estimate.draft_created", "estimate.approved_internal", "proposal.exported", "proposal.marked_sent_externally", "job.won", "job.lost",
  "audience.recipe_approved", "audience.run_started", "audience.run_ready", "audience.export_imported", "audience.sync_failed", "audience.suppression_applied",
  "crm.sync",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const BACKOFF_SECONDS = [60, 300, 1800, 7200, 43200];
export const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;
export const PROCESSING_VERSION = 1;

export type OutboxEvent = Row & {
  type: EventType; status: "pending" | "done" | "skipped" | "dead"; idempotency_key: string; ref_type: string; ref_id: string;
  payload: Record<string, unknown>; attempts: number; next_attempt_at: string; last_error: string | null; processing_version: number; lineage: string[]; tenant: string;
};

export type HandlerResult = { ok: boolean; skipped?: string; error?: string; detail?: Record<string, unknown> };
export type Handler = (e: OutboxEvent) => Promise<HandlerResult>;

export async function enqueue(brand: string, e: { type: EventType; ref_type: string; ref_id: string; payload?: Record<string, unknown>; idempotency_key: string; lineage?: string[] }): Promise<{ event: OutboxEvent; duplicate: boolean }> {
  const existing = await db.findOne("event_outbox", brand, { idempotency_key: e.idempotency_key });
  if (existing) return { event: existing as OutboxEvent, duplicate: true };
  const payload = e.payload ?? {};
  // Raw media and quotes never go into the outbox payload (it feeds CRM/ads integrations).
  if (JSON.stringify(payload).length > 20000) throw new Error("outbox payload too large (no media in events)");
  const row = await db.insert("event_outbox", brand, {
    id: newId("evt_"), type: e.type, status: "pending", idempotency_key: e.idempotency_key, ref_type: e.ref_type, ref_id: e.ref_id,
    payload, attempts: 0, next_attempt_at: nowIso(), last_error: null, processing_version: PROCESSING_VERSION, lineage: e.lineage ?? [], tenant: "space-up-solutions",
    financial_fields: findFinancialLeaks(payload).length > 0,
  });
  return { event: row as unknown as OutboxEvent, duplicate: false };
}

export function nextAttemptAt(attempts: number, now = Date.now()) {
  const s = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)] ?? BACKOFF_SECONDS[0];
  return new Date(now + s * 1000).toISOString();
}

export async function processOutbox(brand: string, handlers: Partial<Record<EventType, Handler>>, opts: { now?: number; limit?: number } = {}) {
  const now = opts.now ?? Date.now();
  const pending = (await db.list("event_outbox", brand, { status: "pending" }, { limit: 200, asc: true }))
    .filter((r) => Date.parse(String(r.next_attempt_at)) <= now).slice(0, opts.limit ?? 50) as OutboxEvent[];
  const summary = { processed: 0, done: 0, skipped: 0, retry: 0, dead: 0 };
  for (const ev of pending) {
    summary.processed++;
    const h = handlers[ev.type];
    let res: HandlerResult;
    try { res = h ? await h(ev) : { ok: true, skipped: "no handler (recorded only)" }; } catch (err) { res = { ok: false, error: err instanceof Error ? err.message : String(err) }; }
    const attempts = (ev.attempts ?? 0) + 1;
    if (res.ok) {
      await db.update("event_outbox", brand, ev.id, { status: res.skipped ? "skipped" : "done", attempts, last_error: null, result: res.skipped ?? "delivered", result_detail: res.detail ?? null, processed_at: new Date(now).toISOString() });
      res.skipped ? summary.skipped++ : summary.done++;
    } else if (attempts >= MAX_ATTEMPTS) {
      await db.update("event_outbox", brand, ev.id, { status: "dead", attempts, last_error: (res.error ?? "failed").slice(0, 500), dead_at: new Date(now).toISOString() });
      summary.dead++;
    } else {
      await db.update("event_outbox", brand, ev.id, { status: "pending", attempts, last_error: (res.error ?? "failed").slice(0, 500), next_attempt_at: nextAttemptAt(attempts, now) });
      summary.retry++;
    }
  }
  return summary;
}

/** Staff replay of a dead or skipped event. Keeps the same idempotency key, so downstream upserts stay idempotent. */
export async function replay(brand: string, id: string) {
  const ev = await db.get("event_outbox", brand, id);
  if (!ev) return null;
  if (ev.status === "done") return ev;
  return db.update("event_outbox", brand, id, { status: "pending", next_attempt_at: nowIso(), replayed_at: nowIso(), replays: Number(ev.replays ?? 0) + 1 });
}
