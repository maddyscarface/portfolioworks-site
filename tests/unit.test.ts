import { describe, it, expect } from "vitest";
import { estimateTurnover, vacancyCost, planPortfolio } from "@/lib/calculators";
import { leadSchema, scoreLead, pipelineFor } from "@/lib/leads";
import { marketFromZip, markets, servedTowns } from "@/config/markets";
import { services } from "@/config/services";
import { accountProjects, accountProperties, demoData } from "@/lib/portal-data";

const base = {
  zip: "02130", unitType: "apartment" as const, bedrooms: 2, bathrooms: 1, sqft: 900,
  painting: "full" as const, flooring: "lvpPartial" as const, kitchen: "refresh" as const, bathroom: "refresh" as const,
  carpentry: "minor" as const, damage: "moderate" as const,
};

describe("turnover estimator", () => {
  it("produces an ordered range with line items and disclaimer", () => {
    const r = estimateTurnover(base);
    expect(r.low).toBeGreaterThan(0);
    expect(r.high).toBeGreaterThan(r.low);
    expect(r.items.length).toBeGreaterThanOrEqual(5);
    expect(r.disclaimer).toMatch(/not a quote/i);
    expect(r.market).toBe("massachusetts");
  });
  it("heavy damage costs more than light", () => {
    expect(estimateTurnover({ ...base, damage: "heavy" }).low).toBeGreaterThan(estimateTurnover({ ...base, damage: "light" }).low);
  });
  it("flags tight move-in targets and out-of-market ZIPs", () => {
    const r = estimateTurnover({ ...base, zip: "90210", targetMoveIn: "2026-11-05", today: "2026-11-02" });
    expect(r.market).toBeNull();
    expect(r.schedule.join(" ")).toMatch(/tight/);
    expect(r.schedule.join(" ")).toMatch(/outside our current service markets/);
  });
  it("notes non-launch markets", () => {
    expect(estimateTurnover({ ...base, zip: "33431" }).schedule.join(" ")).toMatch(/not yet fully launched/);
  });
});

describe("vacancy calculator", () => {
  it("computes daily rent and scenario difference", () => {
    const r = vacancyCost({ monthlyRent: 3650, estimatedDaysVacant: 30, renovationDays: 20, acceleratedRenovationDays: 10 });
    expect(r.dailyRent).toBe(120);
    expect(r.currentExposure).toBe(3600);
    expect(r.acceleratedDaysVacant).toBe(20);
    expect(r.difference).toBe(1200);
    expect(r.note).toMatch(/does not guarantee/);
  });
  it("never goes negative", () => {
    const r = vacancyCost({ monthlyRent: 2000, estimatedDaysVacant: 5, renovationDays: 30, acceleratedRenovationDays: 1 });
    expect(r.acceleratedDaysVacant).toBe(0);
  });
});

describe("portfolio planner", () => {
  it("derives annual turns and quarterly plan", () => {
    const r = planPortfolio({ units: 100, annualTurnoverRate: 40, locations: ["massachusetts"], typicalScope: "standard", annualMaintenanceBudget: 200000, challenges: ["Inconsistent pricing / bids"] });
    expect(r.annualTurns).toBe(40);
    expect(r.schedule.reduce((s, q) => s + q.turns, 0)).toBeGreaterThanOrEqual(39);
    expect(r.categories).toContain("Fixed rate card");
    expect(r.budgetPerUnit).toBe(2000);
  });
});

const validLead = {
  funnel: "portfolio", customerType: "property-manager", firstName: "Dana", lastName: "Reyes", email: "dana@example.com",
  phone: "617-555-0100", zip: "02139", units: 240, properties: 12, services: ["rental-turnovers"], budget: "50-150k",
  timeline: "30-days", contractType: "recurring", consentContact: true, eventId: "evt-12345678",
};

describe("lead schema & scoring", () => {
  it("accepts a valid lead and scores a PM portfolio as hot / partnership", () => {
    const l = leadSchema.parse(validLead);
    const s = scoreLead(l);
    expect(s.tier).toBe("hot");
    expect(s.market).toBe("massachusetts");
    expect(pipelineFor(l)).toBe("partnership");
  });
  it("rejects missing consent and bad ZIP", () => {
    expect(leadSchema.safeParse({ ...validLead, consentContact: false }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, zip: "0213" }).success).toBe(false);
  });
  it("small landlord single turn routes to main pipeline", () => {
    const l = leadSchema.parse({ ...validLead, funnel: "turnover", customerType: "landlord", units: 2, contractType: "single-project", budget: "5-15k" });
    expect(pipelineFor(l)).toBe("main");
  });
});

describe("config integrity", () => {
  it("maps ZIPs to markets", () => {
    expect(marketFromZip("02116")).toBe("massachusetts");
    expect(marketFromZip("33301")).toBe("florida");
    expect(marketFromZip("04043")).toBe("maine");
  });
  it("every service has the required content blocks", () => {
    for (const s of services) {
      expect(s.typicalScope.length).toBeGreaterThan(2);
      expect(s.deliverables.length).toBeGreaterThan(0);
      expect(s.process.length).toBeGreaterThan(2);
      expect(s.faq.length).toBeGreaterThan(0);
      for (const u of s.upsells) expect(services.find((x) => x.slug === u), `${s.slug} upsell ${u}`).toBeTruthy();
    }
  });
  it("only served towns get pages; only MA is launched", () => {
    expect(servedTowns().every((x) => x.town.served)).toBe(true);
    expect(markets.filter((m) => m.status === "launch").map((m) => m.id)).toEqual(["massachusetts"]);
  });
});

describe("portal access scoping", () => {
  it("an account only sees its own properties and projects", () => {
    for (const acct of demoData.accounts) {
      expect(accountProperties(acct.id).every((p) => p.accountId === acct.id)).toBe(true);
      const propIds = new Set(accountProperties(acct.id).map((p) => p.id));
      expect(accountProjects(acct.id).every((p) => propIds.has(p.propertyId))).toBe(true);
    }
    expect(accountProjects("nope")).toEqual([]);
  });
});

import { generateSow } from "@/lib/sow";
describe("SOW generator", () => {
  it("builds a fixed-price turnover SOW with totals and MA clauses", () => {
    const est = estimateTurnover(base);
    const md = generateSow({
      offer: "single-unit-turnover", agreement: "fixed-price", market: "massachusetts",
      client: { name: "Acme", contact: "Dana", email: "d@x.co" }, property: { address: "1 Main St", unit: "2", yearBuilt: 1920 },
      lines: est.items.map((l) => ({ ...l, price: Math.round((l.low + l.high) / 2) })), startDate: "2026-11-09", completionDate: "2026-11-16",
    });
    expect(md).toMatch(/Single-Unit Turnover Proposal/);
    expect(md).toMatch(/\*\*Total\*\*/);
    expect(md).toMatch(/c\.142A/);
    expect(md).toMatch(/Change orders/);
  });
  it("cost-plus rehab includes GMP and contingency", () => {
    const md = generateSow({
      offer: "rental-rehab", agreement: "cost-plus-gmp", market: "florida", client: { name: "B", contact: "C", email: "c@x.co" },
      property: { address: "2 Ocean Ave" }, lines: [{ category: "Kitchen", label: "Full kitchen", low: 0, high: 0, price: 20000 }],
      contingencyPct: 10, gmp: 25000, feePct: 12, startDate: "2027-01-04", completionDate: "2027-02-15",
    });
    expect(md).toMatch(/guaranteed maximum price of \$25,000/);
    expect(md).toMatch(/Contingency/);
    expect(md).toMatch(/Florida contractor license/);
  });
});
