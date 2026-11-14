/**
 * Tape-measure parsing. Customers type what they measured; we normalise to inches (and millimetres) and keep the raw
 * text. A bare number is read as feet and flagged `assumed_unit` so the estimator can confirm it.
 */
export type ParsedLength = { inches: number; mm: number; system: "imperial" | "metric"; assumed_unit: boolean; display: string };

const MAX_IN = 2000 * 12; // 2,000 ft hard ceiling (fence runs); anything larger is a typo

export function parseLength(raw: string | null | undefined): ParsedLength | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/,/g, ".").replace(/\s+/g, " ");
  if (!s) return null;
  let inches: number | null = null;
  let system: ParsedLength["system"] = "imperial";
  let assumed = false;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/))) inches = Number(m[1]) * 12 + (m[2] ? Number(m[2]) : 0);
  else if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)$/))) inches = Number(m[1]);
  else if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)$/))) { inches = (Number(m[1]) * 1000) / 25.4; system = "metric"; }
  else if ((m = s.match(/^(\d+(?:\.\d+)?)\s*cm$/))) { inches = (Number(m[1]) * 10) / 25.4; system = "metric"; }
  else if ((m = s.match(/^(\d+(?:\.\d+)?)\s*mm$/))) { inches = Number(m[1]) / 25.4; system = "metric"; }
  else if ((m = s.match(/^(\d+(?:\.\d+)?)$/))) { inches = Number(m[1]) * 12; assumed = true; }
  if (inches === null || !Number.isFinite(inches) || inches <= 0 || inches > MAX_IN) return null;
  const rounded = Math.round(inches * 100) / 100;
  return { inches: rounded, mm: Math.round(rounded * 25.4), system, assumed_unit: assumed, display: formatFeetInches(rounded) };
}

export function formatFeetInches(inches: number) {
  const ft = Math.floor(inches / 12);
  const inch = Math.round((inches - ft * 12) * 10) / 10;
  return inch ? `${ft}' ${inch}"` : `${ft}'`;
}

export function parseCount(raw: string | number | null | undefined, max = 500): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}

/** Plan area in square feet from rectangles measured in inches. Quantity only, never a price. */
export function rectanglesAreaSqFt(rects: { width_in: number; length_in: number }[]) {
  return Math.round(rects.reduce((a, r) => a + (r.width_in * r.length_in) / 144, 0) * 10) / 10;
}
