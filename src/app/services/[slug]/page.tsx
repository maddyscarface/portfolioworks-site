import { notFound } from "next/navigation";
import { tradeServices, getService } from "@/config/services";
import { ServiceTemplate, serviceMetadata } from "@/components/templates";

export const dynamicParams = false;
export function generateStaticParams() {
  return tradeServices().map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return getService(slug) ? serviceMetadata(slug) : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getService(slug)) notFound();
  return <ServiceTemplate slug={slug} />;
}
