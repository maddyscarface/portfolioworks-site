// specs/03 §6 QA: admin authorization, form errors, retry/dedup, production 503 guard, consent defaults, privacy of funnel answers.
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { POST as leadPOST } from "@/app/api/leads/route";
import { CONSENT_DEFAULT_JS } from "@/lib/consent";

const lead = (over: Record<string, unknown> = {}) => ({
  funnel: "turnover", customerType: "landlord", firstName: "Qa", lastName: "Tester", email: "qa@example.com", phone: "6175550100",
  zip: "02134", units: 1, consentContact: true, eventId: `qa-${Math.random().toString(36).slice(2)}-0001`, startedAt: Date.now() - 60_000,
  details: { occupancy: "vacant", current_pm: "Private PM Co" }, ...over,
});
const post = (body: unknown, ip = `10.0.0.${Math.floor(Math.random() * 250)}`) =>
  leadPOST(new NextRequest("http://localhost/api/leads", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("admin authorization", () => {
  const req = (auth?: string) => new NextRequest("http://localhost/admin", { headers: auth ? { authorization: auth } : {} });
  it("fails closed (404) in production without ADMIN_PASSWORD", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ADMIN_PASSWORD", ""); vi.stubEnv("ADMIN_USERS_JSON", ""); vi.stubEnv("ALLOW_DEMO_ADMIN", "");
    expect((await middleware(req())).status).toBe(404);
  });
  it("requires the password when set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect((await middleware(req())).status).toBe(401);
    expect((await middleware(req(`Basic ${btoa("admin:wrong")}`))).status).toBe(401);
    expect((await middleware(req(`Basic ${btoa("admin:s3cret")}`))).headers.get("x-middleware-next")).toBe("1");
  });
});

describe("lead API", () => {
  it("returns field-level errors for invalid submissions", async () => {
    const r = await post(lead({ email: "not-an-email", zip: "12" }));
    expect(r.status).toBe(422);
    const paths = (await r.json()).issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["email"]));
  });
  it("accepts a retried submit with the same eventId exactly once", async () => {
    const body = lead();
    const a = await (await post(body)).json();
    const b = await (await post(body)).json();
    expect(a.ok).toBe(true); expect(a.duplicate).toBeUndefined();
    expect(b).toMatchObject({ ok: true, duplicate: true });
  });
  it("returns 503 on Vercel production without Upstash even if the memory flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("LEAD_ALLOW_MEMORY_STORE", "1"); vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    expect((await post(lead())).status).toBe(503);
  });
  it("never sends funnel answers or free text to ad platforms", async () => {
    vi.stubEnv("META_PIXEL_ID", "1"); vi.stubEnv("META_CAPI_TOKEN", "t");
    const bodies: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => { bodies.push(String(init?.body ?? "")); return new Response("{}", { status: 200 }); });
    await post(lead({ adsConsent: true, description: "tenant Jane Doe owes rent" }));
    const adCalls = bodies.filter((b) => b.includes("event_name") || b.includes("lead_created"));
    expect(adCalls.length).toBeGreaterThan(0);
    for (const b of adCalls) { expect(b).not.toContain("Private PM Co"); expect(b).not.toContain("Jane Doe"); }
  });
});

describe("consent", () => {
  it("defaults every Google consent signal to denied", () => {
    for (const k of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) expect(CONSENT_DEFAULT_JS).toContain(`${k}:'denied'`);
  });
});
