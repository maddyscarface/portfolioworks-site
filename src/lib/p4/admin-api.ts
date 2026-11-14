import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authErrorResponse, requireStaff } from "./auth";
import { AccessDenied, type Permission, type Staff } from "./rbac";
import { EstimateError } from "../estimator/service";

const H = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
export const ajson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: H });

type Ctx<P> = { req: Request; staff: Staff; params: P };
/** Every admin API: authenticate → authorize (deny by default) → run. Errors never leak stack traces. */
export function adminRoute<P = Record<string, string>>(perm: Permission, fn: (c: Ctx<P>) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const staff = requireStaff(req, perm);
      const out = await fn({ req, staff, params: (ctx?.params ? await ctx.params : {}) as P });
      return out instanceof Response ? out : ajson(out ?? { ok: true });
    } catch (e) {
      const auth = authErrorResponse(e);
      if (auth) return auth;
      if (e instanceof AccessDenied) return ajson({ ok: false, error: "Forbidden" }, 403);
      if (e instanceof EstimateError) return ajson({ ok: false, error: e.message }, e.status);
      if (e instanceof ZodError) return ajson({ ok: false, error: "Invalid input", issues: e.issues.map((i) => i.path.join(".")) }, 422);
      if (e instanceof SyntaxError) return ajson({ ok: false, error: "Invalid JSON" }, 400);
      console.error("[admin-api]", e instanceof Error ? e.message : e);
      return ajson({ ok: false, error: e instanceof Error && /not found|required|choose/i.test(e.message) ? e.message : "Server error" }, 500);
    }
  };
}
export const body = async (req: Request) => { const t = await req.text(); if (t.length > 512_000) throw new SyntaxError("too large"); return t ? JSON.parse(t) : {}; };
