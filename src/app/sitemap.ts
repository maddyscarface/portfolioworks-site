import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { services } from "@/config/services";
import { markets, isIndexable } from "@/config/markets";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = [
    "/", "/rental-turnovers", "/property-managers", "/landlords", "/portfolio-owners", "/real-estate-investors", "/hoa-condos", "/home-renovations",
    "/general-contracting", "/services", "/portfolio-programs", "/unit-turn-estimator", "/portfolio-savings-calculator",
    "/request-a-turnover", "/request-a-property-walkthrough", "/request-a-renovation-estimate", "/how-it-works", "/projects",
    "/about", "/service-areas", "/resources", "/contact", "/privacy", "/terms",
  ];
  const svc = services.filter((s) => s.href.startsWith("/services/")).map((s) => s.href);
  // Only launched (indexable) markets and their served towns go in the sitemap.
  const mk = markets.filter(isIndexable).flatMap((m) => [`/markets/${m.id}`, ...m.towns.filter((t) => t.served).map((t) => `/markets/${m.id}/${t.slug}`)]);
  return [...staticPaths, ...svc, ...mk].map((p) => ({ url: `${site.url}${p}`, lastModified: now, changeFrequency: "monthly", priority: p === "/" ? 1 : 0.7 }));
}
