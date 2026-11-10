import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/portal", "/admin", "/lp/", "/thank-you"] },
      // ChatGPT ads review must reach the paid landing pages (/lp/*) or ads are rejected.
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: ["/", "/lp/"], disallow: ["/api/", "/portal", "/admin"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
