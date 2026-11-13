import { NextResponse, type NextRequest } from "next/server";
import { flags } from "@/config/flags";

const PRIVATE = /^\/(api\/|admin(?:\/|$)|portal(?:\/|$)|thank-you(?:\/|$)|lp\/)/;

/**
 * /admin protection. Basic auth when ADMIN_PASSWORD is set.
 * In production with no ADMIN_PASSWORD, /admin returns 404 (fail closed).
 * Replace with real auth (see docs/12) before storing real client data.
 *
 * X-Robots-Tag: always noindex private/thank-you/LP routes. Staging and any
 * deployment without the launch flag also receive noindex on every response.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  let res: NextResponse;

  if (path === "/admin" || path.startsWith("/admin/")) {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ADMIN !== "true") {
        res = new NextResponse("Not found", { status: 404 });
      } else {
        res = NextResponse.next();
      }
    } else {
      const auth = req.headers.get("authorization");
      if (auth?.startsWith("Basic ")) {
        const [, pass] = atob(auth.slice(6)).split(":");
        if (pass === pw) res = NextResponse.next();
        else res = new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="PortfolioWorks admin"' } });
      } else {
        res = new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="PortfolioWorks admin"' } });
      }
    }
  } else {
    res = NextResponse.next();
  }

  if (flags.noindex || PRIVATE.test(path)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|photos/|llms.txt).*)",
  ],
};
