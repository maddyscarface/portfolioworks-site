import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Staff } from "@/lib/p4/rbac";

/** Isolated local store per test file; every vendor flag left unset (= OFF). */
export function isolate() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "p4-"));
  process.env.P4_DATA_DIR = dir;
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const k of Object.keys(process.env)) if (/^(DATAMOON_|AR_|MEASURE_)/.test(k)) delete process.env[k];
  return dir;
}
export const staff = (role: Staff["role"], brands = ["portfolioworks"]): Staff => ({ user: `t-${role}`, role, brands });
export const req = (url: string, init: RequestInit & { ip?: string } = {}) =>
  new Request(`http://localhost${url}`, { ...init, headers: { "x-forwarded-for": init.ip ?? `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(init.headers as Record<string, string>) } });
export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
