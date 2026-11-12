import Link from "next/link";
import { markets } from "@/config/markets";
import { CtaBand, MarketStatusNote, PageHero, Section } from "@/components/ui";

export const metadata = { title: "Service Areas | Greater Boston, Southeast Florida, Southern Maine | PortfolioWorks", alternates: { canonical: "/service-areas" } };

export default function Page() {
  return (
    <>
      <PageHero image="bostonBrickStreet" eyebrow="Service areas" title="Where we work—and where we're opening." sub="We list a community only when we can actually staff it. Each market has its own licensing, pricing, calendars and crews." />
      {markets.map((m, i) => (
        <Section key={m.id} tone={i % 2 ? "paper" : "white"}>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10">
            <div>
              <p className="eyebrow">{m.status === "launch" ? "Now serving" : m.status === "licensing-pending" ? "Opening soon" : "Under evaluation"}</p>
              <h2 className="text-3xl text-navy mt-2">{m.name}</h2>
              <p className="text-slate mt-3">{m.intro}</p>
              <div className="mt-5"><MarketStatusNote m={m} /></div>
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
      <CtaBand />
    </>
  );
}
