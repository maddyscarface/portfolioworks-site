import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { estimateConfig } from "@/config/estimate";
import { findFinancialLeaks, MONEY_VALUE } from "@/lib/p4/leak";

/** Customer-visible source: everything rendered or served publicly. Admin, server-only internals and API code excluded. */
function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(tsx?|mdx?|txt|json)$/.test(f)) out.push(p);
  }
  return out;
}
const PUBLIC = [...walk("src/app"), ...walk("src/components"), ...walk("public").filter((f) => /\.(txt|json)$/.test(f)), "src/config/services.ts", "src/config/guides.ts", "src/config/markets.ts", "src/config/seo-briefs.ts", "src/config/content-inventory.ts", "src/config/estimate.ts", "src/config/site.ts", "src/config/funnel-fields.ts", "src/lib/planning-tools.ts"]
  .filter((f) => existsSync(f) && !/src\/app\/(admin|api)\//.test(f) && !/src\/components\/admin\//.test(f));
const PRICE = /\$\s?\d|\d\s?(usd|dollars)\b|\d[\d,.]*\s?k\s?[–-]\s?\$?\d|per (sq\.? ?ft|square foot|linear (ft|foot))\b[^"\n]{0,20}\d|\d[^"\n]{0,12}per (sq\.? ?ft|square foot|linear)/i;

describe("customers never see prices", () => {
  it("customer-visible source contains no price figures, rates or bands", () => {
    expect(PUBLIC.length).toBeGreaterThan(40);
    const hits = PUBLIC.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => [f, i + 1, l] as const))
      .filter(([, , l]) => PRICE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/replace\(|RegExp|\\d/.test(l))
      // Allowlisted LEGAL fact (not a price): Maine Home Construction Contracts Act threshold.
      .filter(([, , l]) => !/contracts with specific terms for residential (jobs|work) over \$3,000/.test(l));
    expect(hits.map(([f, n, l]) => `${f}:${n}: ${l.trim().slice(0, 120)}`)).toEqual([]);
  });
  it("public estimate config carries no ranges, bands or public pricing", () => {
    expect(estimateConfig.budgetBands).toEqual([]);
    expect(JSON.stringify(estimateConfig)).not.toMatch(/\$\s?\d|"typical"|publicPricing|perSqFt|\d\s?k\b/);
  });
  it("no client component imports internal pricing modules", () => {
    const client = [...walk("src/app"), ...walk("src/components")].filter((f) => /^["']use client["']/.test(readFileSync(f, "utf8").trimStart()));
    for (const f of client) expect(readFileSync(f, "utf8"), f).not.toMatch(/estimate-internal|config\/pricing|lib\/calculators|lib\/estimator|lib\/p4\/db|server-only/);
  });
  it("leak detector catches money keys and values", () => {
    expect(findFinancialLeaks({ ok: true, steps: [{ title: "Photos" }] })).toEqual([]);
    expect(findFinancialLeaks({ estimate: { total: 5 } }).length).toBeGreaterThan(0);
    expect(findFinancialLeaks({ note: "about $4,000" }).length).toBe(1);
    expect(findFinancialLeaks({ priceRange: "x" }).length).toBe(1);
    expect(MONEY_VALUE.test("12' x 16'")).toBe(false);
  });
  it("built client bundles (if present) contain no internal price strings", () => {
    const dir = ".next/static/chunks";
    if (!existsSync(dir)) return;
    const js = walk(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(f, "utf8")).join("\n");
    for (const s of ["Under $2.5k", "$150k+", "rangeSpread", "turnCostPerUnit", "perBedroom", "ceilingsAddPerSqft", "est_offer_guidance", "margin_pct", "internalEstimateConfig"]) expect(js.includes(s), s).toBe(false);
  });
});

describe("markets: Florida and Maine are not marketed as live", () => {
  it("only Massachusetts is a launch market; the scope planner says FL/ME are not served", async () => {
    const { markets } = await import("@/config/markets");
    const live = Object.values(markets).filter((m) => m.status === "launch").map((m) => m.id);
    expect(live).toEqual(["massachusetts"]);
    const { planScope } = await import("@/lib/planning-tools");
    const base = { unitType: "apartment", bedrooms: 2, bathrooms: 1, sqft: 900, painting: "full", flooring: "none", kitchen: "none", bathroom: "none", carpentry: "none", damage: "light" } as const;
    expect(planScope({ ...base, zip: "02143" }).served).toBe(true);
    const blank = planScope({ ...base, zip: "" }); // regression: blank ZIP must not throw (homepage prerender)
    expect(blank.served).toBe(false); expect(blank.schedule.join(" ")).not.toMatch(/outside our service area|don't serve/);
    expect(planScope({ ...base, zip: "10001" }).schedule.join(" ")).toMatch(/outside our service area/);
    for (const zip of ["33431", "04011"]) {
      const r = planScope({ ...base, zip });
      expect(r.served).toBe(false);
      expect(r.schedule.join(" ")).toMatch(/don't serve .* yet/);
      expect(JSON.stringify(r)).not.toMatch(/\$\s?\d/);
    }
  });
  it("public copy never calls Florida or Maine live / now serving", () => {
    const text = PUBLIC.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(text).not.toMatch(/now serving (south(east)? )?(florida|maine)|(florida|maine)[^.\n]{0,40}\b(now live|is live|are live)\b/i);
  });
});
