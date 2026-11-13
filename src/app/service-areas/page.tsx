import Link from "next/link";
import { markets } from "@/config/markets";
import { CtaBand, MarketStatusNote, PageHero, Section, Breadcrumbs } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Service Areas in Greater Boston | PortfolioWorks",
  description: "PortfolioWorks currently serves launched Greater Boston communities. Southeast Florida and Southern Maine are not active markets.",
  path: "/service-areas",
  image: "/photos/boston-brick-street.jpg",
});

export default function Page() {
  const launch = markets.filter((m) => m.status === "launch");
  const forthcoming = markets.filter((m) => m.status !== "launch");
  return (
    <>
      <PageHero image="bostonBrickStreet" eyebrow="Service areas" title="Greater Boston is our active market." sub="We list a community only when we can actually staff it. Southeast Florida and Southern Maine are shown below for planning context only — they are not marketed as active service areas." />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Service areas", path: "/service-areas" }]} />
      {launch.map((m) => (
        <Section key={m.id} tone="white">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10">
            <div>
              <p className="eyebrow">Now serving</p>
              <h2 className="text-3xl text-navy mt-2">{m.name}</h2>
              <p className="text-slate mt-3">{m.intro}</p>
              <Link href={`/markets/${m.id}`} className="inline-block mt-5 underline text-sm">{m.short} details</Link>
            </div>
            <div className="flex flex-wrap gap-2 content-start">
              {m.towns.filter((t) => t.served).map((t) => (
                <Link key={t.slug} href={`/markets/${m.id}/${t.slug}`} className="chip hover:border-bronze">{t.name}</Link>
              ))}
            </div>
          </div>
        </Section>
      ))}
      <Section tone="paper">
        <p className="eyebrow mb-3">Not currently active</p>
        <h2 className="text-3xl text-navy mb-6">Forthcoming markets</h2>
        <p className="text-slate max-w-3xl mb-10">These pages stay noindex and are excluded from the sitemap until licensing, insurance and crew coverage are confirmed. A license in Massachusetts does not authorize work in another state.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {forthcoming.map((m) => (
            <div key={m.id} className="card p-6">
              <p className="eyebrow">{m.status === "licensing-pending" ? "Licensing pending" : "Under evaluation"}</p>
              <h3 className="text-2xl text-navy mt-2">{m.name}</h3>
              <div className="mt-4"><MarketStatusNote m={m} /></div>
              <Link href={`/markets/${m.id}`} className="inline-block mt-5 underline text-sm">{m.short} details</Link>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
