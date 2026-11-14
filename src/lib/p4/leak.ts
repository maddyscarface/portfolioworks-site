/**
 * Price-leak detection used by customer-facing serializers, outbound CRM payloads and tests.
 * Customers never see prices, rates, totals, margins, budget brackets, quote ids or draft estimates.
 */
const FINANCIAL_TOKENS = new Set(["price", "prices", "pricing", "priced", "rate", "rates", "total", "totals", "subtotal", "margin", "margins", "cost", "costs", "amount", "amounts", "budget", "budgets", "tax", "markup", "discount", "fee", "fees", "monetary", "money", "usd", "quote", "quotes", "typical", "cents"]);
/** True when any token of a key (snake_case, kebab-case or camelCase) is a financial word. */
export function isFinancialKey(key: string) {
  return key.split(/[_\-\s.]+|(?=[A-Z])/).some((t) => FINANCIAL_TOKENS.has(t.toLowerCase()));
}
export const MONEY_VALUE = /(\$\s?\d|\d\s?(usd|dollars)\b|\/\s?sq\.?\s?ft\b.*\d|\d[\d,.]*\s?k\b\s?[–-])/i;

export function findFinancialLeaks(value: unknown, path = "$", out: string[] = []): string[] {
  if (value === null || value === undefined) return out;
  if (typeof value === "string") { if (MONEY_VALUE.test(value)) out.push(`${path} (money-like text)`); return out; }
  if (typeof value === "number" || typeof value === "boolean") return out;
  if (Array.isArray(value)) { value.forEach((v, i) => findFinancialLeaks(v, `${path}[${i}]`, out)); return out; }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isFinancialKey(k)) out.push(`${path}.${k}`);
      findFinancialLeaks(v, `${path}.${k}`, out);
    }
  }
  return out;
}

/** Throws if a customer-bound object contains financial keys or money-like text. */
export function assertCustomerSafe<T>(value: T, label = "payload"): T {
  const leaks = findFinancialLeaks(value);
  if (leaks.length) throw new Error(`Customer-safe check failed for ${label}: ${leaks.slice(0, 5).join(", ")}`);
  return value;
}

/** Copy only allow-listed keys (shallow). Used for every public response. */
export function pick<T extends Record<string, unknown>, K extends string>(obj: T, keys: readonly K[]): Partial<Record<K, unknown>> {
  const out: Partial<Record<K, unknown>> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
