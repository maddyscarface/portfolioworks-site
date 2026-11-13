import Link from "next/link";
import { services } from "@/config/services";
import { CtaBand, PageHero, Section } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Turnover, Renovation & Trade Services | PortfolioWorks",
  description: "Full service catalog: turnovers, painting, flooring, kitchens, baths, carpentry, exterior, MEP coordination, full rehab, capex and maintenance programs.",
  path: "/services",
});

const groups = [
  { k: "turnover", t: "Turnovers" },
  { k: "renovation", t: "Renovation & rehabilitation" },
  { k: "trade", t: "À la carte trades" },
  { k: "program", t: "Programs" },
] as const;

export default function Page() {
  return (
    <>
      <PageHero image="flooringInstall" eyebrow="Service catalog" title="Need one trade or a full rehab? Start here." sub="Every service is available individually or as part of a fully managed scope—priced in writing, executed on one schedule, closed out with a documented record." />
      {groups.map((g, gi) => (
        <Section key={g.k} tone={gi % 2 ? "paper" : "white"}>
          <h2 className="text-3xl text-navy mb-8">{g.t}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {services.filter((s) => s.category === g.k).map((s) => (
              <Link key={s.slug} href={s.href} className="card p-7 hover:border-bronze group">
                <h3 className="text-2xl text-navy">{s.name}</h3>
                <p className="text-slate mt-2">{s.overview}</p>
                <p className="text-xs text-slate mt-4">{s.typicalScope.slice(0, 4).join(" · ")}</p>
                <p className="mt-5 text-bronze font-semibold text-sm group-hover:underline">{s.cta} →</p>
              </Link>
            ))}
          </div>
        </Section>
      ))}
      <CtaBand />
    </>
  );
}
