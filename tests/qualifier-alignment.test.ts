import { describe, expect, it } from "vitest";
import { BUDGET_TO_LEGACY } from "@/config/estimate";
import { internalEstimateConfig as estimateConfig } from "@/config/estimate-internal";
import { leadSchema } from "@/lib/leads";

const enumOptions = (field: unknown): string[] => {
  // zod 4: ZodDefault → unwrap() → ZodEnum.options
  const f = field as { unwrap?: () => { options: string[] }; options?: string[] };
  return f.options ?? f.unwrap?.().options ?? [];
};

describe("qualifier ids align with the lead schema", () => {
  const shape = (leadSchema as unknown as { shape: Record<string, unknown> }).shape;
  it("start ids are valid `timeline` values", () => {
    const tl = enumOptions(shape.timeline);
    expect(tl.length).toBeGreaterThan(0);
    for (const o of estimateConfig.startOptions) expect(tl).toContain(o.id);
  });
  it("every budget band maps onto a valid legacy `budget` value", () => {
    const b = enumOptions(shape.budget);
    for (const band of estimateConfig.budgetBands) expect(b).toContain(BUDGET_TO_LEGACY[band.id]);
  });
});
