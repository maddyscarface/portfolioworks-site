import "server-only";
import { dmFetch, DataMoonError, type Fetcher } from "./client";
import { FIXTURE_CREDITS, FIXTURE_EXPORT_CSV, FIXTURE_FEEDS, FIXTURE_TOPICS, SYNTHETIC_LABEL } from "./fixtures";

/**
 * Provider contract (shared architecture §AudienceProvider), PortfolioWorks-scoped. Three implementations:
 *   Noop  — default; every call returns "disabled". No network.
 *   Mock  — synthetic fixtures + injectable failure scenarios. Labelled SYNTHETIC everywhere. No network.
 *   Live  — real HTTP via dmFetch, which itself refuses without flags + keys. Never selected while flags are off.
 */
export type Scenario = "ok" | "401" | "422" | "429" | "credits_exhausted" | "expired_export" | "building";
export type ExportJob = { export_id: string; status: "building" | "ready" | "expired" | "source_expired"; total_rows: number; synthetic?: boolean };

export interface DataMoonAdapter {
  readonly mode: "noop" | "mock" | "live";
  listTopics(kind: "b2b" | "b2c", keywords: string): Promise<{ topics: string[]; synthetic?: boolean }>;
  buildAudience(body: Record<string, unknown>, family: "main_module" | "main_ext"): Promise<{ id: string | null; status: string; synthetic?: boolean }>;
  pollAudience(id: string): Promise<{ status: string; total?: number; synthetic?: boolean }>;
  listFeeds(): Promise<{ id: string; name: string }[]>;
  previewExport(feedId: string, lookbackDays: number): Promise<{ estimated_rows: number; synthetic?: boolean }>;
  createExport(feedId: string, opts: { lookback_days: number; max_rows: number; page_size: number }): Promise<ExportJob>;
  pollExport(exportId: string): Promise<ExportJob>;
  downloadExport(exportId: string): Promise<{ csv: string; synthetic?: boolean }>;
  enrichContacts(bundle: string, contactIds: string[]): Promise<{ found: number; synthetic?: boolean }>;
  getCredits(): Promise<{ record_limit: number | null; records_used: number; remaining: number | null; synthetic?: boolean }>;
  registerWebhook(url: string, mode: "create" | "test"): Promise<{ ok: boolean; synthetic?: boolean }>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

const disabled = () => Promise.reject(new DataMoonError("disabled", "DataMoon is not connected (feature flags off / no credentials)"));
export const NoopDataMoonAdapter: DataMoonAdapter = {
  mode: "noop",
  listTopics: disabled, buildAudience: disabled, pollAudience: disabled, listFeeds: disabled, previewExport: disabled, createExport: disabled,
  pollExport: disabled, downloadExport: disabled, enrichContacts: disabled, getCredits: disabled, registerWebhook: disabled,
  health: async () => ({ ok: false, detail: "Not connected" }),
};

export function mockAdapter(scenario: Scenario = "ok"): DataMoonAdapter {
  const fail = () => {
    if (scenario === "401") throw new DataMoonError("unauthorized", "[synthetic] invalid key", 401);
    if (scenario === "422") throw new DataMoonError("validation", "[synthetic] validation failed", 422);
    if (scenario === "429") throw new DataMoonError("rate_limited", "[synthetic] rate limited", 429, 30);
    if (scenario === "credits_exhausted") throw new DataMoonError("credits_exhausted", "[synthetic] credits exhausted", 403);
  };
  return {
    mode: "mock",
    async listTopics(kind) { fail(); return { topics: FIXTURE_TOPICS[kind], synthetic: true }; },
    async buildAudience() { fail(); return { id: "synthetic-aud-1", status: "in_progress", synthetic: true }; },
    async pollAudience() { fail(); return { status: scenario === "building" ? "in_progress" : "completed", total: 3, synthetic: true }; },
    async listFeeds() { fail(); return FIXTURE_FEEDS.map(({ id, name }) => ({ id, name })); },
    async previewExport() { fail(); return { estimated_rows: 6, synthetic: true }; },
    async createExport() { fail(); return { export_id: "00000000-0000-4000-8000-00000000e001", status: "building", total_rows: 0, synthetic: true }; },
    async pollExport(id) { fail(); return { export_id: id, status: scenario === "expired_export" ? "source_expired" : scenario === "building" ? "building" : "ready", total_rows: 6, synthetic: true }; },
    async downloadExport() { fail(); if (scenario === "expired_export") throw new DataMoonError("gone", "[synthetic] export source expired", 410); return { csv: FIXTURE_EXPORT_CSV, synthetic: true }; },
    async enrichContacts(_b, ids) { fail(); return { found: Math.min(ids.length, 2), synthetic: true }; },
    async getCredits() { fail(); return { ...FIXTURE_CREDITS, synthetic: true }; },
    async registerWebhook() { fail(); return { ok: true, synthetic: true }; },
    async health() { return { ok: scenario === "ok", detail: `${SYNTHETIC_LABEL} (scenario: ${scenario})` }; },
  };
}

/** Real adapter. Every method goes through dmFetch (flag + key gated). Shapes follow the documented schemas. */
export function liveAdapter(fetcher: Fetcher = fetch, e = process.env): DataMoonAdapter {
  return {
    mode: "live",
    async listTopics(kind, keywords) {
      if (keywords.trim().length < 3) throw new DataMoonError("validation", "keywords must be at least 3 characters");
      const r = await dmFetch<{ success: boolean; data: string[]; error?: string }>("main_topics", `/${kind}-topics/search`, { query: { keywords, mode: "auto" } }, fetcher, e);
      return { topics: r.data ?? [] };
    },
    async buildAudience(body, family) {
      const r = await dmFetch<{ message: string; id?: number | string }>("main_module", `/${family === "main_ext" ? "ext" : "m"}/audiences/build`, { body }, fetcher, e);
      return { id: r.id !== undefined ? String(r.id) : null, status: "in_progress" }; // id location in the 201 body is UNVERIFIED (docs show message + data[])
    },
    async pollAudience(id) { const r = await dmFetch<{ status: string; data?: { total?: number } }>("main_module", `/m/audiences/fetch/${encodeURIComponent(id)}`, {}, fetcher, e); return { status: r.status, total: r.data?.total }; },
    async listFeeds() { const r = await dmFetch<{ items?: { id: string; name: string }[] }>("intent", "/intent/feeds", { query: { page: "1", page_size: "50" } }, fetcher, e); return r.items ?? []; },
    async previewExport(feedId, lookbackDays) { const r = await dmFetch<{ total_rows?: number }>("intent", "/intent/feeds/exports/preview", { body: { feed_id: feedId, lookback_days: lookbackDays, preview_rows: 10, skip_count: false } }, fetcher, e); return { estimated_rows: r.total_rows ?? 0 }; },
    async createExport(feedId, o) { const r = await dmFetch<ExportJob>("intent", "/intent/feeds/exports", { body: { feed_id: feedId, lookback_days: o.lookback_days, page_size: o.page_size, max_rows: o.max_rows, require_contact_id: true } }, fetcher, e); return r; },
    async pollExport(exportId) { const r = await dmFetch<{ items?: ExportJob[] }>("intent", "/intent/feeds/exports/list", { body: { export_ids: [exportId] } }, fetcher, e); const j = r.items?.[0]; if (!j) throw new DataMoonError("not_found", "export not found"); return j; },
    async downloadExport(exportId) {
      const r = await dmFetch<{ url?: string; download_url?: string }>("intent", "/intent/feeds/exports/download-url", { body: { export_id: exportId } }, fetcher, e);
      const url = r.url ?? r.download_url;
      if (!url) throw new DataMoonError("server", "CSV still rendering; poll again");
      const f = await fetcher(url, { cache: "no-store" });
      if (!f.ok) throw new DataMoonError(f.status === 403 || f.status === 410 ? "gone" : "server", `download ${f.status}`, f.status);
      const buf = Buffer.from(await f.arrayBuffer());
      const { gunzipSync } = await import("node:zlib");
      return { csv: (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8") };
    },
    async enrichContacts(bundle, ids) { const r = await dmFetch<{ found?: number }>("intent", `/enrich/${encodeURIComponent(bundle)}`, { body: { contact_ids: ids } }, fetcher, e); return { found: r.found ?? 0 }; },
    async getCredits() { return dmFetch("intent", "/organization/credits", {}, fetcher, e); },
    async registerWebhook(url, mode) { const r = await dmFetch<{ delivered?: boolean; id?: string }>("intent", "/webhooks", { body: { mode, url, ...(mode === "create" ? { enabled: true } : {}) } }, fetcher, e); return { ok: mode === "test" ? Boolean(r.delivered) : Boolean(r.id) }; },
    async health() { try { await this.getCredits(); return { ok: true, detail: "credits endpoint reachable" }; } catch (err) { return { ok: false, detail: err instanceof Error ? err.message : "error" }; } },
  };
}

/** Production selector: Live only when the intent or main family is actually enabled with keys; otherwise Noop. */
export function getAdapter(e = process.env): DataMoonAdapter {
  const anyOn = e.DATAMOON_ENABLED === "true" && ((e.DATAMOON_INTENT_ENABLED === "true" && e.DATAMOON_INTENT_KEY) || (e.DATAMOON_MAIN_API_ENABLED === "true" && e.DATAMOON_MAIN_MODULE_KEY));
  return anyOn ? liveAdapter(fetch, e) : NoopDataMoonAdapter;
}
