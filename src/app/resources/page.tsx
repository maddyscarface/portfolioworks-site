import Link from "next/link";
import { briefs } from "@/config/seo-briefs";
import { CtaBand, PageHero, Section } from "@/components/ui";

export const metadata = { title: "Resources for Landlords & Property Managers | PortfolioWorks", description: "Guides on rental turnovers, renovation budgeting, vendor management and planning tools.", alternates: { canonical: "/resources" } };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Resources" title="Guides for owners who run their rentals like a business." sub="Practical guidance on turnovers, renovation scopes, contracts and planning. Articles are published as they are written and reviewed." />
      <Section tone="white">
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Link href="/unit-turn-estimator" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Unit Turn Estimator</p></Link>
          <Link href="/portfolio-savings-calculator#vacancy" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Vacancy Cost Calculator</p></Link>
          <Link href="/portfolio-savings-calculator#planner" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Portfolio Improvement Planner</p></Link>
        </div>
        <h2 className="text-2xl text-navy mb-6">Guides in production</h2>
        <div className="grid md:grid-cols-2 gap-px bg-line border border-line">
          {briefs.map((b) => (
            <div key={b.slug} className="bg-white p-6">
              <p className="text-xs text-slate uppercase tracking-wider">{b.market === "all" ? "All markets" : b.market} · {b.audience}</p>
              <h3 className="text-lg text-navy mt-1">{b.title}</h3>
              <p className="text-sm text-slate mt-2">{b.answer}</p>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
