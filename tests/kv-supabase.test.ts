import { afterEach, describe, expect, it, vi } from "vitest";

/** Supabase/Postgres KV backend for the lead log, idempotency keys, rate limits and attribution lists. */
async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/integrations");
}
const SB = { UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", SUPABASE_URL: "https://example.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "test-key", SUPABASE_KV: "" };

describe("Supabase/Postgres KV backend (integrations.redis)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

  it("maps the Redis commands the app uses onto kv_* RPCs with the server key", async () => {
    const calls: { fn: string; body: Record<string, unknown>; auth: string | null }[] = [];
    const replies: Record<string, unknown> = { kv_get: JSON.stringify({ a: 1 }), kv_setnx: true, kv_incr: 3, kv_lrange: [JSON.stringify({ eventId: "e1" })], kv_set: null, kv_lpush: 2 };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const fn = url.split("/rpc/")[1];
      expect(url.startsWith("https://example.supabase.co/rest/v1/rpc/")).toBe(true);
      calls.push({ fn, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") });
      const r = replies[fn];
      return r === null ? new Response(null, { status: 204 }) : new Response(JSON.stringify(r), { status: 200 });
    }));
    const m = await load(SB);
    expect(m.kvBackend()).toBe("supabase");
    expect(m.kvConfigured()).toBe(true);
    await m.storeLead({ eventId: "e1", email: "a@example.com" });
    expect(await m.getLead("e1")).toEqual({ a: 1 });
    expect(await m.listLeads()).toEqual([{ eventId: "e1" }]);
    expect(calls.map((c) => c.fn)).toEqual(["kv_lpush", "kv_set", "kv_get", "kv_lrange"]);
    expect(calls[0].body).toEqual({ p_key: "leads", p_value: JSON.stringify({ eventId: "e1", email: "a@example.com" }), p_max: 5000 });
    expect(calls[1].body).toEqual({ p_key: "lead:e1", p_value: JSON.stringify({ eventId: "e1", email: "a@example.com" }), p_ttl: null });
    expect(calls[3].body).toEqual({ p_key: "leads", p_start: 0, p_stop: 199 });
    expect(calls.every((c) => c.auth === "Bearer test-key")).toBe(true);
  });

  it("claimEvent uses SET NX with a TTL and rateLimit sets the window atomically", async () => {
    const calls: { fn: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const fn = url.split("/rpc/")[1];
      calls.push({ fn, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(fn === "kv_setnx" ? calls.filter((c) => c.fn === "kv_setnx").length === 1 : 9), { status: 200 });
    }));
    const m = await load(SB);
    expect(await m.claimEvent("evt-1")).toBe(true);
    expect(await m.claimEvent("evt-1")).toBe(false);
    expect(calls[0]).toEqual({ fn: "kv_setnx", body: { p_key: "evt:evt-1", p_value: "1", p_ttl: 604800 } });
    expect(await m.rateLimit("1.2.3.4", 8, 600)).toBe(false); // kv_incr replied 9 > 8
    const incr = calls.find((c) => c.fn === "kv_incr")!;
    expect(incr.body.p_ttl).toBe(600);
  });

  it("lead intake is no longer blocked on preview/production when Supabase is set; Upstash wins when both are set", async () => {
    let m = await load({ ...SB, NODE_ENV: "production", VERCEL_ENV: "production", LEAD_ALLOW_MEMORY_STORE: "" });
    expect(m.memoryStoreBlocked()).toBe(false);
    m = await load({ ...SB, UPSTASH_REDIS_REST_URL: "https://u", UPSTASH_REDIS_REST_TOKEN: "t" });
    expect(m.kvBackend()).toBe("upstash");
    m = await load({ ...SB, SUPABASE_KV: "0", NODE_ENV: "production", VERCEL_ENV: "production" });
    expect(m.kvBackend()).toBe("memory");
    expect(m.memoryStoreBlocked()).toBe(true);
  });

  it("surfaces RPC failures instead of silently falling back to memory", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    const m = await load(SB);
    await expect(m.getLead("e1")).rejects.toThrow(/kv_get failed: 500/);
  });
});
