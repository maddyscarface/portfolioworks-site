import type { NextRequest } from "next/server";
/** Reports are private: require ATTRIBUTION_EXPORT_SECRET as ?key= or x-pw-report-key. 404 when unset. */
export function reportAuth(req: NextRequest): "ok" | "disabled" | "unauthorized" {
  const secret = process.env.ATTRIBUTION_EXPORT_SECRET;
  if (!secret) return "disabled";
  const got = req.headers.get("x-pw-report-key") ?? req.nextUrl.searchParams.get("key");
  return got === secret ? "ok" : "unauthorized";
}
