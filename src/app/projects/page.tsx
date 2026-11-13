import { Check, CtaBand, Heading, PageHero, Placeholder, Section } from "@/components/ui";
import { CASE_STUDY_SECTIONS, caseStudies } from "@/config/case-studies";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Projects & Case Studies | PortfolioWorks",
  description: "Documented rental turnovers and renovations with scopes, schedules and before/after photography, published only from completed work.",
  path: "/projects",
});

export default function Page() {
  return (
    <>
      <PageHero image={null} eyebrow="Projects" title="Documented work, published only when it’s real." sub="Every case study follows one template: challenge, scope, trades, scheduling, before/after, closeout and results, the results only when they are real." />
      <Section tone="white">
        {caseStudies.length === 0 ? (
          <>
            <Heading title="Case studies are being documented." sub="We publish only completed PortfolioWorks projects with verified numbers and owner permission. The first case studies will appear here as projects close out." />
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
              <div>
                <p className="eyebrow eyebrow-rule mb-4">Every case study includes</p>
                <ol className="space-y-4">{CASE_STUDY_SECTIONS.map(([t, d], i) => (
                  <li key={t} className="flex gap-4 border-t border-line pt-4"><span className="num text-bronze">{String(i + 1).padStart(2, "0")}</span><span><span className="font-semibold text-navy">{t}.</span> <span className="text-slate">{d}</span></span></li>
                ))}</ol>
                <ul className="mt-6 space-y-2 text-sm"><Check>Owner permission on file before anything is published</Check></ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["Turnover — before", "Turnover — after", "Kitchen — before", "Kitchen — after"].map((l) => <Placeholder key={l} label={l} className="aspect-[4/3]" />)}
              </div>
            </div>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {caseStudies.map((c) => (
              <article key={c.title} className="card p-6">
                <p className="text-xs text-slate">{c.location} · {c.propertyType}</p>
                <h2 className="text-2xl text-navy">{c.title}</h2>
                <p className="mt-2 text-slate">{c.challenge}</p>
                <p className="mt-3 text-sm">Trades: {c.trades.join(", ")} · Planned {c.scheduling.planned} · Actual {c.scheduling.actual}</p>
                {c.results && <ul className="mt-3 space-y-1 text-sm">{c.results.map((r) => <Check key={r}>{r}</Check>)}</ul>}
              </article>
            ))}
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
