import type { MetadataRoute } from "next";
import { services } from "@/config/services";
import { markets, isIndexable } from "@/config/markets";
import { publishedGuides } from "@/config/guides";
import { canonicalBase, CONTENT_UPDATED, PHASE3_CONTENT_DATE } from "@/lib/seo";

const STATIC_PATHS = [
  "/",
  "/rental-turnovers",
  "/rental-renovations",
  "/property-managers",
  "/landlords",
  "/portfolio-owners",
  "/real-estate-investors",
  "/hoa-condos",
  "/home-renovations",
  "/general-contracting",
  "/services",
  "/portfolio-programs",
  "/unit-turn-estimator",
  "/portfolio-savings-calculator",
  "/request-a-turnover",
  "/request-a-property-walkthrough",
  "/request-a-renovation-estimate",
  "/how-it-works",
  "/projects",
  "/about",
  "/service-areas",
  "/resources",
  "/contact",
  "/privacy",
  "/terms",
];

function lastMod(path: string, fallback?: string): Date {
  const raw = CONTENT_UPDATED[path] ?? fallback ?? PHASE3_CONTENT_DATE;
  return new Date(`${raw}T00:00:00Z`);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = canonicalBase();
  const svc = services.filter((s) => s.href.startsWith("/services/")).map((s) => s.href);
  // Only launched (indexable) markets and their served towns. FL licensing-pending and ME evaluation stay out.
  const mk = markets
    .filter(isIndexable)
    .flatMap((m) => [`/markets/${m.id}`, ...m.towns.filter((t) => t.served).map((t) => `/markets/${m.id}/${t.slug}`)]);
  const guides = publishedGuides().map((g) => `/resources/${g.slug}`);
  const paths = [...STATIC_PATHS, ...svc, ...mk, ...guides];
  return paths.map((p) => {
    const guide = p.startsWith("/resources/") ? publishedGuides().find((g) => `/resources/${g.slug}` === p) : undefined;
    return {
      url: `${base}${p === "/" ? "/" : p}`,
      lastModified: lastMod(p, guide?.datePublished),
      changeFrequency: p === "/" ? "weekly" : p.startsWith("/resources/") ? "monthly" : "monthly",
      priority: p === "/" ? 1 : p === "/rental-turnovers" || p === "/rental-renovations" || p === "/portfolio-programs" ? 0.9 : 0.7,
    };
  });
}
