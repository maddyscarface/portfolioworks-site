import { notFound } from "next/navigation";
import { funnels } from "@/config/funnels";
import { FunnelTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(funnels).map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = funnels[(await params).slug];
  if (!f) return {};
  // Paid landing pages are noindex to avoid duplicating the organic service pages.
  const slug = (await params).slug;
  return pageMeta({ title: f.title, description: f.description, path: `/lp/${slug}`, index: false });
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const f = funnels[(await params).slug];
  if (!f) notFound();
  return <FunnelTemplate c={f} />;
}
