import Link from "next/link";
import { allGuides } from "@/config/guides";
import { Breadcrumbs, CtaBand, PageHero, Section } from "@/components/ui";
import { JsonLd, pageMeta, webPageSchema } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Resources for Landlords & Property Managers | PortfolioWorks",
  description: "Operational guides on rental turnovers, make-ready planning, renovation scopes, closeout documentation and comparing trade bids.",
  path: "/resources",
  image: "/photos/scope-planning.jpg",
});

export default function Page() {
  const guides = allGuides();
  const core = guides.filter((g) => g.market === "MA" || g.market === "all");
  const forthcoming = guides.filter((g) => g.market === "FL" || g.market === "ME");
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...webPageSchema({ path: "/resources", name: "Resources", description: "Operational guides for rental owners and managers." }) }} />
      <PageHero image="scopePlanning" eyebrow="Resources" title="Operational guides for landlords and property managers." sub="Checklists and planning articles written from the work itself: turnovers, scopes, closeout and vendor decisions. Florida and Maine notes are clearly labeled as inactive markets." />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }]} />
      <Section tone="white">
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Link href="/unit-turn-estimator" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Unit Turn Scope Planner</p></Link>
          <Link href="/portfolio-savings-calculator#vacancy" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Vacancy Cost Calculator</p></Link>
          <Link href="/portfolio-savings-calculator#planner" className="card p-6 hover:border-bronze"><p className="eyebrow">Tool</p><p className="text-xl text-navy mt-2 display">Portfolio Improvement Planner</p></Link>
        </div>
        <h2 className="text-2xl text-navy mb-6">Guides</h2>
        <div className="grid md:grid-cols-2 gap-px bg-line border border-line">
          {core.map((b) => (
            <Link key={b.slug} href={`/resources/${b.slug}`} className="bg-white p-6 hover:bg-paper-2">
              <p className="text-xs text-slate uppercase tracking-wider">{b.market === "all" ? "All markets" : "Greater Boston"} · {b.audience}</p>
              <h3 className="text-lg text-navy mt-1">{b.title}</h3>
              <p className="text-sm text-slate mt-2">{b.answer}</p>
            </Link>
          ))}
        </div>
        <h2 className="text-2xl text-navy mt-16 mb-3">Forthcoming markets</h2>
        <p className="text-sm text-slate mb-6 max-w-3xl">These notes are educational and noindexed. PortfolioWorks does not currently serve Southeast Florida or Southern Maine as active markets.</p>
        <div className="grid md:grid-cols-2 gap-px bg-line border border-line">
          {forthcoming.map((b) => (
            <Link key={b.slug} href={`/resources/${b.slug}`} className="bg-white p-6 hover:bg-paper-2">
              <p className="text-xs text-slate uppercase tracking-wider">{b.market === "FL" ? "Southeast Florida · not active" : "Southern Maine · not active"} · {b.audience}</p>
              <h3 className="text-lg text-navy mt-1">{b.title}</h3>
              <p className="text-sm text-slate mt-2">{b.answer}</p>
            </Link>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
