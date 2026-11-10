import { notFound } from "next/navigation";
import { getMarket, isIndexable, markets } from "@/config/markets";
import { MarketTemplate } from "@/components/templates";

export const dynamicParams = false;
export function generateStaticParams() {
  return markets.map((m) => ({ market: m.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  const m = getMarket((await params).market);
  if (!m) return {};
  return {
    title: `Rental Turnover & Renovation Contractor — ${m.short} | PortfolioWorks`,
    description: m.intro.slice(0, 155),
    alternates: { canonical: `/markets/${m.id}` },
    robots: isIndexable(m) ? undefined : { index: false, follow: true },
  };
}
export default async function Page({ params }: { params: Promise<{ market: string }> }) {
  const m = getMarket((await params).market);
  if (!m) notFound();
  return <MarketTemplate m={m} />;
}
