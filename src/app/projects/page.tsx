import { CtaBand, Heading, PageHero, Placeholder, Section } from "@/components/ui";

export const metadata = { title: "Projects & Case Studies | PortfolioWorks", description: "Documented rental turnovers and renovations with scopes, schedules and before/after photography.", alternates: { canonical: "/projects" } };

/**
 * Add real case studies here as projects complete (with owner permission).
 * Do NOT publish invented projects, testimonials or numbers.
 */
const caseStudies: { title: string; location: string; scope: string; planned: string; actual: string; summary: string }[] = [];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Projects" title="Documented work, not stock photos." sub="Each case study shows the starting condition, the approved scope and budget, planned vs. actual schedule, and the finished result." />
      <Section tone="white">
        {caseStudies.length === 0 ? (
          <>
            <Heading title="Case studies are being documented." sub="We publish only completed PortfolioWorks projects with verified numbers and owner permission. The first case studies will appear here as projects close out." />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Turnover — before", "Turnover — after", "Bathroom — before", "Bathroom — after", "Kitchen — before", "Kitchen — after"].map((l) => <Placeholder key={l} label={l} className="aspect-[4/3]" />)}
            </div>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {caseStudies.map((c) => (
              <article key={c.title} className="card p-6">
                <p className="text-xs text-slate">{c.location}</p>
                <h2 className="text-2xl text-navy">{c.title}</h2>
                <p className="mt-2 text-slate">{c.summary}</p>
                <p className="mt-3 text-sm">Scope: {c.scope} · Planned {c.planned} · Actual {c.actual}</p>
              </article>
            ))}
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
