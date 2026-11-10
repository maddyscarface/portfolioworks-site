/**
 * Counts how many times this browser saw pricing (price-guide sections, pricing pages,
 * calculators, and the typical range shown inside the form). Stored first-party in
 * localStorage; sent with the lead as saw_pricing + pricing_views.
 */
const KEY = "est_pricing_views_v1";
type Store = { n: number; pages: string[]; last?: number };

function read(): Store {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (v && typeof v.n === "number") return v; } catch {}
  return { n: 0, pages: [] };
}

/** Records one view per page per 30 minutes so re-renders and quick refreshes don't inflate the count. */
export function recordPricingView(where: string) {
  if (typeof window === "undefined") return;
  const s = read();
  const sessionKey = `est_pv_${where}`;
  try {
    const seen = Number(sessionStorage.getItem(sessionKey) ?? 0);
    if (Date.now() - seen < 30 * 60_000) return;
    sessionStorage.setItem(sessionKey, String(Date.now()));
  } catch {}
  s.n += 1;
  if (!s.pages.includes(where)) s.pages = [...s.pages, where].slice(-10);
  s.last = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function pricingViews(): { count: number; pages: string[] } {
  if (typeof window === "undefined") return { count: 0, pages: [] };
  const s = read();
  return { count: s.n, pages: s.pages };
}
