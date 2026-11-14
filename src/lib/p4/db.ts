import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { newId, nowIso } from "./ids";

/**
 * Phase 4 tenant-scoped repository.
 *
 * Production: Supabase/Postgres via PostgREST with the service role (server-only), tables from
 * supabase/migrations/20261114_phase4_core.sql. Each table keeps indexed columns (brand, ids, status) plus a
 * `data` jsonb document, and child tables reference projects by (brand, project_id) so a row can never point at
 * another brand's project.
 *
 * Dev/staging fallback: one JSON file per table. Same fail-closed rule as the existing lead store: in production it
 * refuses to run unless ALLOW_LOCAL_STORE is set (staging only). On Vercel the fallback lives in /tmp, which is
 * per-instance and ephemeral: it is a demo store, NOT durable persistence.
 *
 * Every read and write takes a brand. A row from another brand is treated as not found (not discoverable by id).
 */
export type Row = { id: string; brand: string; created_at: string; updated_at: string } & Record<string, unknown>;
export type Where = Record<string, string | number | boolean | null>;

/** Indexed columns per table (everything else is stored in `data`). Keep in sync with the SQL migration. */
export const TABLES = {
  projects: ["lead_id", "status", "service", "customer_email_hash"],
  capture_sessions: ["project_id", "token_hash", "status", "kind"],
  media_assets: ["project_id", "session_id", "status", "kind"],
  measurement_revisions: ["project_id", "session_id", "revision"],
  capture_followups: ["project_id", "session_id", "status"],
  estimates: ["project_id", "status", "revision"],
  pricebook_items: ["category", "status"],
  proposal_exports: ["project_id", "estimate_id", "format"],
  event_outbox: ["type", "status", "idempotency_key", "ref_id"],
  audit_log: ["actor", "action", "target_type", "target_id"],
  audience_recipes: ["persona", "status", "api_family"],
  audience_runs: ["recipe_id", "status"],
  vendor_exports: ["recipe_id", "feed_id", "status"],
  vendor_contacts: ["contact_id", "email_hash", "status", "export_id"],
  suppressions: ["email_hash", "reason"],
  consent_evidence: ["email_hash", "kind"],
  webhook_events: ["event_id", "status"],
  upload_sessions: ["project_id", "session_id", "status"],
} as const;
export type Table = keyof typeof TABLES;

const env = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY });
export const usingSupabase = () => Boolean(env().url && env().key);
export const storageMode = () => (usingSupabase() ? "supabase" : process.env.VERCEL ? "local-ephemeral" : "local-file");
/** On Vercel without Supabase each function instance has its own /tmp, so walkthrough links can't be shared reliably. */
export const durableStorage = () => storageMode() !== "local-ephemeral";
/** Walkthrough is refused in Vercel production until durable storage exists; previews keep a clearly flagged demo mode. */
export const walkthroughStorageAllowed = () => durableStorage() || process.env.VERCEL_ENV !== "production";

export function dataDir() {
  if (process.env.P4_DATA_DIR) return process.env.P4_DATA_DIR;
  return process.env.VERCEL ? path.join("/tmp", ".data") : path.join(process.cwd(), ".data");
}

export function assertLocalAllowed() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_STORE && !process.env.P4_DATA_DIR) {
    throw new Error("Phase 4 store not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local fallback is staging/dev only)");
  }
}

// ---------- local JSON backend ----------
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => undefined));
  return next;
}
const file = (t: Table) => path.join(dataDir(), "p4", `${t}.json`);
async function readT(t: Table): Promise<Row[]> {
  try { return JSON.parse(await fs.readFile(file(t), "utf8")); } catch { return []; }
}
async function writeT(t: Table, rows: Row[]) {
  await fs.mkdir(path.dirname(file(t)), { recursive: true });
  const tmp = `${file(t)}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows));
  await fs.rename(tmp, file(t));
}

// ---------- Supabase backend (PostgREST) ----------
function sb(p: string, init: RequestInit = {}) {
  const { url, key } = env();
  return fetch(`${url}/rest/v1/${p}`, {
    ...init,
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
    cache: "no-store",
  });
}
function toDb(t: Table, r: Row) {
  const cols = TABLES[t] as readonly string[];
  const out: Record<string, unknown> = { id: r.id, brand: r.brand, created_at: r.created_at, updated_at: r.updated_at };
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (["id", "brand", "created_at", "updated_at"].includes(k)) continue;
    if (cols.includes(k)) out[k] = v; else data[k] = v;
  }
  out.data = data;
  return out;
}
function fromDb(r: Record<string, unknown>): Row {
  const { data, ...rest } = r as { data?: Record<string, unknown> };
  return { ...(data ?? {}), ...rest } as Row;
}
const q = (v: unknown) => encodeURIComponent(v === null ? "null" : String(v));
function filterQs(t: Table, brand: string, where: Where = {}) {
  const cols = new Set<string>(["id", ...(TABLES[t] as readonly string[])]);
  const parts = [`brand=eq.${q(brand)}`];
  for (const [k, v] of Object.entries(where)) {
    if (!cols.has(k)) throw new Error(`Filter ${t}.${k} is not an indexed column`);
    parts.push(v === null ? `${k}=is.null` : `${k}=eq.${q(v)}`);
  }
  return parts.join("&");
}
const matches = (r: Row, brand: string, where: Where = {}) => r.brand === brand && Object.entries(where).every(([k, v]) => (v === null ? r[k] == null : r[k] === v));

export function requireBrand(brand: string | undefined | null): string {
  if (!brand || !/^[a-z0-9_-]{2,40}$/.test(brand)) throw new Error("brand required");
  return brand;
}

export const db = {
  async insert<T extends Record<string, unknown>>(t: Table, brand: string, row: T & { id?: string }): Promise<Row & T> {
    requireBrand(brand);
    const now = nowIso();
    const full = { ...row, id: row.id ?? newId(), brand, created_at: now, updated_at: now } as unknown as Row & T;
    if (usingSupabase()) {
      const r = await sb(`p4_${t}`, { method: "POST", body: JSON.stringify(toDb(t, full)) });
      if (!r.ok) throw new Error(`insert ${t} failed ${r.status}: ${await r.text()}`);
      return fromDb(((await r.json()) as Record<string, unknown>[])[0]) as Row & T;
    }
    assertLocalAllowed();
    return withLock(t, async () => { const rows = await readT(t); rows.push(full); await writeT(t, rows); return full; });
  },

  async get(t: Table, brand: string, id: string): Promise<Row | null> {
    requireBrand(brand);
    if (!id || typeof id !== "string" || id.length > 80) return null;
    if (usingSupabase()) {
      const r = await sb(`p4_${t}?${filterQs(t, brand, { id })}&limit=1`);
      if (!r.ok) throw new Error(`get ${t} failed ${r.status}`);
      const rows = (await r.json()) as Record<string, unknown>[];
      return rows[0] ? fromDb(rows[0]) : null;
    }
    assertLocalAllowed();
    return (await readT(t)).find((r) => r.id === id && r.brand === brand) ?? null;
  },

  async list(t: Table, brand: string, where: Where = {}, opts: { limit?: number; asc?: boolean } = {}): Promise<Row[]> {
    requireBrand(brand);
    const limit = Math.min(opts.limit ?? 500, 2000);
    if (usingSupabase()) {
      const r = await sb(`p4_${t}?${filterQs(t, brand, where)}&order=created_at.${opts.asc ? "asc" : "desc"}&limit=${limit}`);
      if (!r.ok) throw new Error(`list ${t} failed ${r.status}`);
      return ((await r.json()) as Record<string, unknown>[]).map(fromDb);
    }
    assertLocalAllowed();
    filterQs(t, brand, where); // same indexed-column rule as Supabase, so local tests catch bad filters
    const rows = (await readT(t)).filter((r) => matches(r, brand, where));
    rows.sort((a, b) => (opts.asc ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)));
    return rows.slice(0, limit);
  },

  async findOne(t: Table, brand: string, where: Where): Promise<Row | null> {
    return (await db.list(t, brand, where, { limit: 1 }))[0] ?? null;
  },

  async update<T extends Record<string, unknown>>(t: Table, brand: string, id: string, patch: T): Promise<Row | null> {
    requireBrand(brand);
    const { id: _i, brand: _b, created_at: _c, ...safe } = patch as Record<string, unknown>;
    if (usingSupabase()) {
      const cur = await db.get(t, brand, id);
      if (!cur) return null;
      const merged = { ...cur, ...safe, updated_at: nowIso() } as Row;
      const r = await sb(`p4_${t}?${filterQs(t, brand, { id })}`, { method: "PATCH", body: JSON.stringify(toDb(t, merged)) });
      if (!r.ok) throw new Error(`update ${t} failed ${r.status}`);
      return merged;
    }
    assertLocalAllowed();
    return withLock(t, async () => {
      const rows = await readT(t);
      const i = rows.findIndex((r) => r.id === id && r.brand === brand);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...safe, updated_at: nowIso() } as Row;
      await writeT(t, rows);
      return rows[i];
    });
  },
};

// ---------- private object storage ----------
export const BUCKETS = { capture: "capture-media", exports: "proposal-exports", vendor: "vendor-imports" } as const;

export async function putObject(bucket: string, key: string, body: Buffer, contentType: string, upsert = false): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(bucket) || key.includes("..")) throw new Error("bad storage key");
  if (usingSupabase()) {
    const { url, key: sk } = env();
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: "POST", headers: { Authorization: `Bearer ${sk}`, "Content-Type": contentType, "x-upsert": upsert ? "true" : "false" }, body: new Uint8Array(body),
    });
    if (!r.ok) throw new Error(`storage put failed ${r.status}`);
    return `${bucket}/${key}`;
  }
  assertLocalAllowed();
  const p = path.join(dataDir(), "objects", bucket, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  return `${bucket}/${key}`;
}

export async function getObject(storagePath: string, range?: [number, number]): Promise<Buffer | null> {
  if (storagePath.includes("..")) return null;
  if (usingSupabase()) {
    const { url, key } = env();
    const r = await fetch(`${url}/storage/v1/object/${storagePath}`, { headers: { Authorization: `Bearer ${key}`, ...(range ? { Range: `bytes=${range[0]}-${range[1]}` } : {}) }, cache: "no-store" });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }
  assertLocalAllowed();
  try {
    const b = await fs.readFile(path.join(dataDir(), "objects", storagePath));
    return range ? b.subarray(range[0], range[1] + 1) : b;
  } catch { return null; }
}

export async function deleteObject(storagePath: string) {
  if (usingSupabase()) {
    const { url, key } = env();
    await fetch(`${url}/storage/v1/object/${storagePath}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } });
    return;
  }
  try { await fs.unlink(path.join(dataDir(), "objects", storagePath)); } catch { /* already gone */ }
}

/** Short-lived signed URL for direct browser upload (Supabase only; bypasses the Vercel request body limit). */
export async function signedUploadUrl(bucket: string, key: string): Promise<string | null> {
  if (!usingSupabase()) return null;
  const { url, key: sk } = env();
  const r = await fetch(`${url}/storage/v1/object/upload/sign/${bucket}/${key}`, { method: "POST", headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) return null;
  const j = (await r.json()) as { url?: string };
  return j.url ? `${url}/storage/v1${j.url}` : null;
}

/** Short-lived signed read URL for staff playback (default 5 minutes). Local mode streams through an authorized route. */
export async function signedReadUrl(storagePath: string, expiresIn = 300): Promise<string | null> {
  if (!usingSupabase()) return null;
  const { url, key } = env();
  const r = await fetch(`${url}/storage/v1/object/sign/${storagePath}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn }) });
  if (!r.ok) return null;
  const j = (await r.json()) as { signedURL?: string };
  return j.signedURL ? `${url}/storage/v1${j.signedURL}` : null;
}
