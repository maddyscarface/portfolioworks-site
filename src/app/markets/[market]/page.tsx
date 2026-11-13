import { notFound } from "next/navigation";
import { getMarket, isIndexable, marketPageDescription, marketPageTitle, markets } from "@/config/markets";
import { MarketTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return markets.map((m) => ({ market: m.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  const m = getMarket((await params).market);
  if (!m) return {};
  return pageMeta({
    title: marketPageTitle(m),
    description: marketPageDescription(m),
    path: `/markets/${m.id}`,
    index: isIndexable(m),
  });
}
export default async function Page({ params }: { params: Promise<{ market: string }> }) {
  const m = getMarket((await params).market);
  if (!m) notFound();
  return <MarketTemplate m={m} />;
}
