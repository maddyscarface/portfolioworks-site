import "server-only";
import { flags } from "../p4/flags";
import { dmKeys } from "./config";
import { INTENT, MAIN } from "./catalog";

/**
 * Low-level DataMoon HTTP client. Refuses to make ANY network call unless the master flag, the family flag and the
 * family's own key are all present. Auth modes are kept separate:
 *   main-module → X-Api-Key header · legacy → api_key in JSON body · topics → no auth · intent → X-API-Key header.
 * fetch is injectable for tests; production uses global fetch.
 */
export type Family = "main_module" | "main_legacy" | "main_topics" | "intent";
export class DataMoonError extends Error {
  constructor(public code: "disabled" | "unauthorized" | "forbidden" | "not_found" | "validation" | "rate_limited" | "credits_exhausted" | "gone" | "server" | "network", msg: string, public status?: number, public retryAfter?: number) { super(msg); }
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export function familyEnabled(family: Family, e = process.env) {
  const f = flags(e); const k = dmKeys(e);
  if (family === "main_topics") return f.datamoonTopicSearch;
  if (family === "main_module") return f.datamoonMain && Boolean(k.mainModule);
  if (family === "main_legacy") return f.datamoonMain && Boolean(k.legacy);
  return f.datamoonIntent && Boolean(k.intent);
}

export function buildRequest(family: Family, path: string, init: { method?: string; body?: Record<string, unknown>; query?: Record<string, string> } = {}, e = process.env) {
  const k = dmKeys(e);
  const base = family === "intent" ? INTENT.base : MAIN.base;
  const qs = init.query ? `?${new URLSearchParams(init.query).toString()}` : "";
  const headers: Record<string, string> = { Accept: "application/json" };
  let body = init.body;
  if (family === "main_module") headers["X-Api-Key"] = k.mainModule ?? "";
  if (family === "intent") headers["X-API-Key"] = k.intent ?? "";
  if (family === "main_legacy") body = { ...(body ?? {}), api_key: k.legacy ?? "" }; // body, never the query string
  if (body) headers["Content-Type"] = "application/json";
  if (qs.includes("api_key")) throw new Error("api_key must not be sent in a query string");
  return { url: `${base}${path}${qs}`, init: { method: init.method ?? (body ? "POST" : "GET"), headers, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" as RequestCache } };
}

export async function dmFetch<T>(family: Family, path: string, init: Parameters<typeof buildRequest>[2] = {}, fetcher: Fetcher = fetch, e = process.env): Promise<T> {
  if (!familyEnabled(family, e)) throw new DataMoonError("disabled", `DataMoon ${family} is disabled or not connected`);
  const req = buildRequest(family, path, init, e);
  let r: Response;
  try { r = await fetcher(req.url, req.init); } catch (err) { throw new DataMoonError("network", err instanceof Error ? err.message : "network error"); }
  if (r.ok) return (await r.json()) as T;
  const text = await r.text().catch(() => "");
  const retry = Number(r.headers.get("retry-after")) || undefined;
  const map: Record<number, DataMoonError["code"]> = { 400: "unauthorized", 401: "unauthorized", 403: /credit|quota|record/i.test(text) ? "credits_exhausted" : "forbidden", 404: "not_found", 410: "gone", 422: /record limit|monthly/i.test(text) ? "credits_exhausted" : "validation", 429: "rate_limited" };
  throw new DataMoonError(map[r.status] ?? "server", `DataMoon ${r.status}: ${text.slice(0, 200)}`, r.status, retry);
}
