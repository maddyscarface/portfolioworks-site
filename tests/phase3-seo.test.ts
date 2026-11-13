import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalBase,
  canonicalUrl,
  jsonLdString,
  INTENDED_PRODUCTION_ORIGIN,
  organizationGraph,
  CONTENT_UPDATED,
} from "@/lib/seo";
import { computeNoindex } from "@/config/flags";
import { site } from "@/config/site";
import { publishedGuides, allGuides, getGuide } from "@/config/guides";
import { allRouteBriefs, contentInventory } from "@/config/content-inventory";
import { services } from "@/config/services";
import { funnels } from "@/config/funnels";
import { isIndexable, marketPageDescription, marketPageTitle, markets, servedTowns, townPageDescription, townPageTitle } from "@/config/markets";
import { priceSheet } from "@/config/pricing";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { priceSheet as sheet } from "@/config/pricing";

const root = join(__dirname, "..");

describe("canonical URLs", () => {
  it("never uses a vercel.app host as the canonical origin", () => {
    const prevC = process.env.NEXT_PUBLIC_CANONICAL_URL;
    const prevS = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://portfolioworks-staging.vercel.app";
    process.env.NEXT_PUBLIC_CANONICAL_URL = "https://portfolioworks-staging.vercel.app";
    expect(canonicalBase()).toBe(INTENDED_PRODUCTION_ORIGIN);
    expect(canonicalUrl("/rental-turnovers")).toBe(`${INTENDED_PRODUCTION_ORIGIN}/rental-turnovers`);
    process.env.NEXT_PUBLIC_CANONICAL_URL = "https://portfolioworkscontracting.com";
    expect(canonicalBase()).toBe("https://portfolioworkscontracting.com");
    process.env.NEXT_PUBLIC_CANONICAL_URL = prevC;
    process.env.NEXT_PUBLIC_SITE_URL = prevS;
  });
});

describe("noindex gates", () => {
  it("noindexes preview, vercel.app hosts, and deploys without the launch flag", () => {
    expect(computeNoindex({ VERCEL_ENV: "preview", NEXT_PUBLIC_INDEXABLE_SITE: "true", NEXT_PUBLIC_CANONICAL_URL: "https://portfolioworkscontracting.com" })).toBe(true);
    expect(computeNoindex({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://portfolioworks-site.vercel.app" })).toBe(true);
    expect(computeNoindex({ VERCEL_ENV: "production", NEXT_PUBLIC_CANONICAL_URL: "https://portfolioworkscontracting.com" })).toBe(true);
    expect(computeNoindex({ VERCEL_ENV: "production", NEXT_PUBLIC_INDEXABLE_SITE: "true", NEXT_PUBLIC_CANONICAL_URL: "https://portfolioworkscontracting.com" })).toBe(false);
    expect(computeNoindex({ SITE_NOINDEX: "1", NEXT_PUBLIC_INDEXABLE_SITE: "true", NEXT_PUBLIC_CANONICAL_URL: "https://portfolioworkscontracting.com" })).toBe(true);
  });
});

describe("JSON-LD", () => {
  it("escapes '<' in serialized JSON-LD", () => {
    expect(jsonLdString({ name: "A <script>alert(1)</script>" })).toContain("\\u003cscript>");
    expect(jsonLdString({ name: "A <script>" })).not.toContain("<script>");
  });
  it("describes a ProfessionalService without a storefront address, limited to Greater Boston", () => {
    const graph = organizationGraph();
    const json = jsonLdString(graph);
    expect(json).not.toContain("<");
    const org = (graph["@graph"] as Record<string, unknown>[])[0];
    expect(JSON.stringify(org["@type"])).toMatch(/ProfessionalService/);
    expect(json).not.toMatch(/streetAddress|postalCode/);
    expect(JSON.stringify(org.areaServed)).toMatch(/Greater Boston/);
    expect(json).not.toMatch(/Southeast Florida|Southern Maine/);
  });
});

describe("sitemap and market gating", () => {
  it("includes launched MA routes, new conversion and guide pages, and omits FL/ME, thank-you and LP URLs", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/rental-turnovers"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/rental-renovations"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/portfolio-programs"))).toBe(true);
    expect(urls.some((u) => u.includes("/resources/what-is-included-in-a-rental-unit-turnover"))).toBe(true);
    expect(urls.some((u) => u.includes("/markets/massachusetts/boston"))).toBe(true);
    expect(urls.some((u) => u.includes("/markets/florida"))).toBe(false);
    expect(urls.some((u) => u.includes("/markets/maine"))).toBe(false);
    expect(urls.some((u) => u.includes("/thank-you") || u.includes("/lp/") || u.includes("/admin") || u.includes("/portal"))).toBe(false);
    expect(entries.every((e) => !e.url.includes("vercel.app"))).toBe(true);
    // lastModified must be a real content date, not "now"
    const dates = entries.map((e) => (e.lastModified as Date).toISOString().slice(0, 10));
    expect(new Set(dates).size).toBeGreaterThanOrEqual(1);
    expect(dates.every((d) => d <= "2026-11-13" || CONTENT_UPDATED["/"] === d)).toBe(true);
  });
  it("only marks launch markets as indexable", () => {
    expect(markets.filter(isIndexable).map((m) => m.id)).toEqual(["massachusetts"]);
    expect(isIndexable(markets.find((m) => m.id === "florida")!)).toBe(false);
    expect(isIndexable(markets.find((m) => m.id === "maine")!)).toBe(false);
  });
});

describe("guides", () => {
  it("publishes the six Phase 3 operational guides and keeps FL/ME articles out of the indexable set", () => {
    for (const slug of [
      "what-is-included-in-a-rental-unit-turnover",
      "planning-a-30-day-make-ready",
      "maintenance-vs-capital-improvements",
      "commercial-landlord-renovation-scope",
      "documenting-unit-closeout",
      "comparing-multiple-trade-bids",
    ]) {
      const g = getGuide(slug);
      expect(g, slug).toBeTruthy();
      expect(g!.answer.split(/\s+/).length).toBeGreaterThanOrEqual(40);
      expect(g!.indexable ?? true).toBe(true);
    }
    const published = publishedGuides().map((g) => g.slug);
    expect(published).not.toContain("rental-turnover-west-palm-beach");
    expect(published).not.toContain("rental-property-repairs-kennebunk");
    expect(allGuides().some((g) => g.market === "FL" && g.indexable === false)).toBe(true);
  });
  it("does not invent vacancy or capacity guarantees", () => {
    const blob = allGuides()
      .flatMap((g) => [g.answer, ...g.sections.flatMap((s) => s.body)])
      .join(" ");
    const sentences = blob.split(/(?<=[.!?])\s+/);
    const leftover = sentences.filter(
      (s) => /guarantee/i.test(s) && !/not |does not |doesn't |do not |cannot |none of /i.test(s) && !/guaranteed maximum price/i.test(s),
    );
    expect(leftover).toEqual([]);
  });
});

describe("hero and funnels preserved", () => {
  it("uses the Phase 3 search H1 and keeps the five-contractors line as a secondary headline", () => {
    expect(site.heroHeadline).toBe("Rental Turnovers and Renovations in Greater Boston");
    expect(site.heroSecondary).toMatch(/Five Different Contractors/);
    expect(site.heroEyebrow).toMatch(/PortfolioWorks/);
    expect(site.pathways.map((p) => p.label)).toEqual([
      "Plan a Unit Turnover",
      "Request Renovation Estimate",
      "Discuss a Portfolio Program",
    ]);
  });
  it("keeps estimator figures clearly dated and planning-only", () => {
    expect(priceSheet.assumptionDate).toBe("2026-11-13");
    expect(priceSheet.assumptionLabel).toMatch(/Planning assumptions dated/i);
    expect(priceSheet.assumptionLabel).toMatch(/not a contractual bid/i);
    expect(sheet.version).toBeTruthy();
  });
});

describe("content inventory", () => {
  it("records audience, query group, stage and evidence for the primary and utility routes", () => {
    const paths = contentInventory.map((r) => r.path);
    expect(paths).toEqual(expect.arrayContaining([
      "/", "/rental-turnovers", "/rental-renovations", "/portfolio-programs",
      "/about", "/contact", "/how-it-works", "/services", "/projects", "/service-areas",
      "/resources", "/privacy", "/terms", "/general-contracting",
    ]));
    expect(contentInventory.every((r) => r.primaryKeyword && r.h1 && r.title && r.description && r.cta.href && r.evidence)).toBe(true);
  });
  it("covers every sitemap URL", () => {
    const inv = new Set(allRouteBriefs().map((r) => r.path));
    for (const e of sitemap()) {
      const path = new URL(e.url).pathname.replace(/\/$/, "") || "/";
      expect(inv.has(path), path).toBe(true);
    }
  });
});

describe("metadata length", () => {
  function assertSeo(title: string, description: string, label: string) {
    expect(title.length, `${label} title (${title.length}): ${title}`).toBeLessThanOrEqual(60);
    expect(description.length, `${label} desc (${description.length}): ${description}`).toBeGreaterThanOrEqual(120);
    expect(description.length, `${label} desc (${description.length}): ${description}`).toBeLessThanOrEqual(160);
  }
  it("keeps titles <=60 characters and descriptions 120-160 on every public route", () => {
    for (const row of allRouteBriefs()) assertSeo(row.title, row.description, row.path);
    for (const s of services) assertSeo(s.seoTitle, s.seoDescription, s.href);
    for (const [id, f] of Object.entries(funnels)) assertSeo(f.title, f.description, id);
    for (const g of allGuides()) assertSeo(g.seoTitle, g.description, g.slug);
    for (const m of markets) assertSeo(marketPageTitle(m), marketPageDescription(m), m.id);
    for (const { market, town } of servedTowns()) {
      assertSeo(townPageTitle(town), townPageDescription(town, market), town.slug);
    }
  });
});

describe("brand icons and manifest", () => {
  it("ships favicon, svg/png icons, apple-touch-icon and a themed web manifest", () => {
    const files = [
      "favicon.ico",
      "icon.svg",
      "icon-32.png",
      "icon-192.png",
      "icon-512.png",
      "apple-touch-icon.png",
      "site.webmanifest",
    ];
    for (const f of files) {
      expect(existsSync(join(root, "public", f)), f).toBe(true);
    }
    const manifest = JSON.parse(readFileSync(join(root, "public", "site.webmanifest"), "utf8"));
    expect(manifest.theme_color).toBe("#142036");
    expect(manifest.background_color).toBe("#f7f4ee");
    expect(manifest.icons.some((i: { src: string }) => i.src === "/icon-192.png")).toBe(true);
    expect(manifest.icons.some((i: { src: string }) => i.src === "/icon-512.png")).toBe(true);
  });
});

describe("robots when the site is not indexable", () => {
  it("closes the site to crawlers (default staging)", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    expect(rules[0]?.disallow).toBe("/");
  });
});
