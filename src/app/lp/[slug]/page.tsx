import { notFound } from "next/navigation";
import { funnels } from "@/config/funnels";
import { FunnelTemplate } from "@/components/templates";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(funnels).map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = funnels[(await params).slug];
  if (!f) return {};
  // Paid landing pages are noindex to avoid duplicating the organic service pages.
  return { title: f.title, description: f.description, robots: { index: false, follow: false }, alternates: { canonical: `/lp/${(await params).slug}` } };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const f = funnels[(await params).slug];
  if (!f) notFound();
  return <FunnelTemplate c={f} />;
}
