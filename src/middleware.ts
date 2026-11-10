import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin protection. Basic auth when ADMIN_PASSWORD is set.
 * In production with no ADMIN_PASSWORD, /admin returns 404 (fail closed).
 * Replace with real auth (see docs/12) before storing real client data.
 */
export function middleware(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ADMIN !== "true") return new NextResponse("Not found", { status: 404 });
    return NextResponse.next();
  }
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === pw) return NextResponse.next();
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="PortfolioWorks admin"' } });
}

export const config = { matcher: ["/admin/:path*"] };
