import type { Metadata } from "next";
import { flags } from "@/config/flags";
import { site } from "@/config/site";

/** Intended production host. VERIFY with owner before Search Console / final canonicals. */
export const INTENDED_PRODUCTION_ORIGIN = "https://portfolioworkscontracting.com";

function originOf(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Canonical origin for metadata, sitemap and schema.
 * Never uses a vercel.app host — staging must not be published as the production canonical.
 */
export function canonicalBase(): string {
  const preferred = originOf(process.env.NEXT_PUBLIC_CANONICAL_URL);
  if (preferred && !preferred.includes("vercel.app")) return preferred;
  const siteUrl = originOf(process.env.NEXT_PUBLIC_SITE_URL);
  if (siteUrl && !siteUrl.includes("vercel.app")) return siteUrl;
  return INTENDED_PRODUCTION_ORIGIN;
}

export function canonicalUrl(path = "/"): string {
  const base = canonicalBase().replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
  );
}

const defaultOgPath = "/photos/boston-brick-apartments.jpg";

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  index?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
}): Metadata {
  const url = canonicalUrl(opts.path);
  const image = opts.image ?? defaultOgPath;
  const absImage = image.startsWith("http") ? image : `${canonicalBase()}${image}`;
  const index = flags.noindex ? false : (opts.index ?? true);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: opts.type ?? "website",
      siteName: site.name,
      images: [{ url: absImage, alt: opts.imageAlt ?? "PortfolioWorks — rental turnovers and renovations in Greater Boston (illustrative)" }],
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [absImage],
    },
  };
}

export const orgId = () => `${canonicalBase()}/#organization`;
export const websiteId = () => `${canonicalBase()}/#website`;

/** Organization + ProfessionalService graph. No storefront address (none verified). areaServed limited to launched MA market. */
export function organizationGraph(): Record<string, unknown> {
  const base = canonicalBase();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": orgId(),
        name: site.legalName,
        legalName: site.legalName,
        url: base,
        slogan: site.tagline,
        email: site.email,
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Greater Boston, Massachusetts",
        },
        knowsAbout: [
          "Rental unit turnovers",
          "Apartment make-ready",
          "Rental property renovations",
          "Portfolio maintenance programs",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "PortfolioWorks services",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Rental unit turnovers", url: canonicalUrl("/rental-turnovers") } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Rental property renovations", url: canonicalUrl("/rental-renovations") } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Portfolio maintenance programs", url: canonicalUrl("/portfolio-programs") } },
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId(),
        url: `${base}/`,
        name: site.name,
        publisher: { "@id": orgId() },
      },
    ],
  };
}

export function webPageSchema(opts: {
  path: string;
  name: string;
  description: string;
  typ?: "WebPage" | "AboutPage" | "ContactPage" | "FAQPage" | "CollectionPage";
}): Record<string, unknown> {
  const url = canonicalUrl(opts.path);
  return {
    "@type": opts.typ ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": websiteId() },
    about: { "@id": orgId() },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl(items[items.length - 1]?.path ?? "/")}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export function serviceSchema(opts: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@type": "Service",
    "@id": `${canonicalUrl(opts.path)}#service`,
    name: opts.name,
    description: opts.description,
    url: canonicalUrl(opts.path),
    provider: { "@id": orgId() },
    areaServed: { "@type": "AdministrativeArea", name: "Greater Boston, Massachusetts" },
  };
}

export function articleSchema(opts: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
}): Record<string, unknown> {
  const url = canonicalUrl(opts.path);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: url,
    author: { "@id": orgId() },
    publisher: { "@id": orgId() },
  };
}

export function faqSchema(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Default last-modified for Phase 3 content inventory. Per-route overrides live in CONTENT_UPDATED. */
export const PHASE3_CONTENT_DATE = "2026-11-13";

export const CONTENT_UPDATED: Record<string, string> = {
  "/": PHASE3_CONTENT_DATE,
  "/rental-turnovers": PHASE3_CONTENT_DATE,
  "/rental-renovations": PHASE3_CONTENT_DATE,
  "/portfolio-programs": PHASE3_CONTENT_DATE,
  "/resources": PHASE3_CONTENT_DATE,
  "/service-areas": PHASE3_CONTENT_DATE,
  "/unit-turn-estimator": PHASE3_CONTENT_DATE,
  "/portfolio-savings-calculator": PHASE3_CONTENT_DATE,
  "/home-renovations": "2026-11-12",
};
