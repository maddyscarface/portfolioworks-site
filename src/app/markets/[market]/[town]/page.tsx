import { notFound } from "next/navigation";
import { getMarket, isIndexable, servedTowns, townPageDescription, townPageTitle } from "@/config/markets";
import { TownTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";

/** Town pages exist ONLY for towns flagged served=true in markets.ts (no doorway pages). */
export const dynamicParams = false;
export function generateStaticParams() {
  return servedTowns().map(({ market, town }) => ({ market: market.id, town: town.slug }));
}
async function resolve(params: Promise<{ market: string; town: string }>) {
  const p = await params;
  const m = getMarket(p.market);
  const t = m?.towns.find((x) => x.slug === p.town && x.served);
  return m && t ? { m, t } : null;
}
export async function generateMetadata({ params }: { params: Promise<{ market: string; town: string }> }) {
  const r = await resolve(params);
  if (!r) return {};
  return pageMeta({
    title: townPageTitle(r.t),
    description: townPageDescription(r.t, r.m),
    path: `/markets/${r.m.id}/${r.t.slug}`,
    index: isIndexable(r.m),
  });
}
export default async function Page({ params }: { params: Promise<{ market: string; town: string }> }) {
  const r = await resolve(params);
  if (!r) notFound();
  return <TownTemplate m={r.m} t={r.t} />;
}
