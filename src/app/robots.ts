import type { MetadataRoute } from "next";
import { flags } from "@/config/flags";
import { canonicalBase } from "@/lib/seo";

const PRIVATE = ["/api/", "/portal", "/admin", "/thank-you"];
const AD_LANDING = ["/lp/"];

export default function robots(): MetadataRoute.Robots {
  // Staging, preview, unverified hosts and any deployment without the launch flag stay fully closed to crawlers.
  if (flags.noindex) return { rules: [{ userAgent: "*", disallow: "/" }] };

  const disallow = [...PRIVATE, ...AD_LANDING];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      // ChatGPT ads review must reach the paid landing pages (/lp/*) or ads are rejected.
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: ["/", "/lp/"], disallow: PRIVATE },
    ],
    sitemap: `${canonicalBase()}/sitemap.xml`,
  };
}
