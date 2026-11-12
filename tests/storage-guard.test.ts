import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStoreBlocked } from "@/lib/integrations";

describe("production storage guard", () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it("blocks in-memory lead storage in production without Upstash", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("LEAD_ALLOW_MEMORY_STORE", "");
    expect(memoryStoreBlocked()).toBe(true);
  });
  it("allows it for explicit local testing and in development", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("LEAD_ALLOW_MEMORY_STORE", "1");
    expect(memoryStoreBlocked()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(memoryStoreBlocked()).toBe(false);
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("LEAD_ALLOW_MEMORY_STORE", "");
    expect(memoryStoreBlocked()).toBe(false);
  });
  it("never lets the memory flag defeat the guard on the Vercel production environment (specs/03 §6)", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("LEAD_ALLOW_MEMORY_STORE", "1");
    expect(memoryStoreBlocked()).toBe(true);
  });
});
