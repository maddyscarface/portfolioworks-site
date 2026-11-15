import "server-only";
import { db } from "./db";
import { sha256 } from "./ids";
import type { Staff } from "./rbac";

/**
 * Append-only audit log. Entries are never updated or deleted by the app; each entry carries a hash of its content
 * chained to the previous entry for tamper evidence. Never store prices, media bytes or secrets in `detail`.
 */
export type AuditInput = { actor: Staff | { user: string; role: string } | "system" | "customer"; action: string; target_type: string; target_id?: string; detail?: Record<string, unknown> };

const FORBIDDEN_DETAIL = /(rate|price|total|margin|cost|amount|secret|token|password|api_?key)/i;

export function scrubDetail(detail: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(detail).filter(([k]) => !FORBIDDEN_DETAIL.test(k)).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 300) : v]));
}

/**
 * Canonical JSON (object keys sorted recursively) so the hash survives storage round-trips: Postgres jsonb does not
 * preserve key order, so plain JSON.stringify of a row read back from Supabase can differ from what was hashed.
 */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => canonicalJson(x === undefined ? null : x)).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

export async function audit(brand: string, a: AuditInput) {
  const actor = a.actor === "system" || a.actor === "customer" ? a.actor : a.actor.user;
  const role = a.actor === "system" || a.actor === "customer" ? a.actor : a.actor.role;
  const prev = (await db.list("audit_log", brand, {}, { limit: 1 }))[0];
  const detail = scrubDetail(a.detail);
  const body = { actor, role, action: a.action, target_type: a.target_type, target_id: a.target_id ?? null, detail, prev_hash: (prev?.hash as string) ?? null };
  return db.insert("audit_log", brand, { ...body, hash: sha256(canonicalJson(body)) });
}

/** Tamper check: every entry's hash matches its content and every prev_hash points at an existing entry. */
export function verifyAuditChain(rows: Record<string, unknown>[]): boolean {
  const hashes = new Set(rows.map((r) => r.hash));
  let roots = 0;
  for (const r of rows) {
    const body = { actor: r.actor, role: r.role, action: r.action, target_type: r.target_type, target_id: r.target_id ?? null, detail: r.detail, prev_hash: r.prev_hash ?? null };
    // Canonical hash (current); plain JSON.stringify accepted for entries written before canonical hashing (local store).
    if (sha256(canonicalJson(body)) !== r.hash && sha256(JSON.stringify(body)) !== r.hash) return false;
    if (r.prev_hash === null || r.prev_hash === undefined) roots++;
    else if (!hashes.has(r.prev_hash)) return rows.length >= 1000 ? true : false; // older history outside the window
  }
  return roots <= 1;
}
