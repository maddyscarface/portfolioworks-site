import Link from "next/link";
import { site } from "@/config/site";
import LeadForm from "@/components/LeadForm";
import { Breadcrumbs, Btn, Check, CtaBand, Faq, FaqJsonLd, Heading, PageHero, Photo, Section } from "@/components/ui";
import { JsonLd, pageMeta, serviceSchema, webPageSchema } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Rental Property Renovations | PortfolioWorks",
  description: "Plan rental rehab, painting, flooring, bathrooms and multi-trade renovations with written scopes and coordinated work.",
  path: "/rental-renovations",
  image: "/photos/kitchen-boston.jpg",
});

const faq = [
  { q: "Is the estimator a bid?", a: "No. Any figure shown before a written, approved scope is a planning assumption. Final pricing follows a site walk or a confirmed photo survey and a signed scope." },
  { q: "Can I still hire you for one trade?", a: "Yes. Painting, flooring, carpentry and other trades remain available à la carte. Multi-trade renovations simply put those trades under one scope and one coordinator." },
  { q: "How do change orders work?", a: "Work outside the approved scope is written up with photos, price and schedule impact, and it does not start until you approve it." },
  { q: "Do you serve every town in Massachusetts?", a: "No. Active coverage is the launched Greater Boston towns listed on our service-area pages. Requests outside those towns are reviewed honestly for availability." },
];

export default function Page() {
  const path = "/rental-renovations";
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            webPageSchema({ path, name: "Rental Property Renovations in Greater Boston", description: "Written scopes and coordinated trades for rental rehabs in Greater Boston." }),
            serviceSchema({ name: "Rental property renovations", description: "Plan rental rehab, painting, flooring, bathrooms and multi-trade renovations with written scopes and coordinated work.", path }),
          ],
        }}
      />
      <PageHero
        image="kitchenBoston"
        eyebrow="Renovations · Greater Boston"
        title="Rental Property Renovations in Greater Boston"
        sub="Scope validation, specified materials, licensed trades where required, written approvals and change-order control. One team coordinates the work so you are not managing five vendors through a rehab."
        aside={<LeadForm funnel="rehab" defaultServices={["full-rehab"]} />}
      >
        <Btn href="/request-a-renovation-estimate">{site.pathways[1].label}</Btn>
        <Btn href="/home-renovations" variant="ghost-light">Owner-occupied renovations</Btn>
      </PageHero>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Rental renovations", path }]} />

      <Section tone="white">
        <Heading eyebrow="A renovation is not a longer turnover" title="Five controls that keep a rehab accountable." sub="Turnovers restore a unit to a known standard. Renovations change that standard — and need tighter documentation." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ["Scope validation", "A site walk or thorough photo survey comes first. Existing conditions, access limits and hidden-risk areas (wet rooms, plaster, aging electrical) are written down before anyone prices a lump sum."],
            ["Trades", "Painting, flooring, carpentry, and licensed plumbing, electrical, HVAC or gas work sit in one sequence. You do not have to schedule the plumber around the painter."],
            ["Material specifications", "Products, grades or allowances, colors and substitution rules are written into the scope so later units can match and invoices can be checked."],
            ["Approvals", "Nothing proceeds without a written, approved scope. We name who can approve the original work and who can approve changes, including any dollar threshold you set."],
            ["Change orders", "New work, price and schedule impact are described in writing and signed before that work starts. Verbal adds on site are not how the job runs."],
            ["Planning figures only", "Estimator ranges and early budgets are planning assumptions with a dated price sheet. They are not contractual bids."],
          ].map(([t, d]) => (
            <div key={t} className="card p-6">
              <h2 className="text-xl text-navy">{t}</h2>
              <p className="text-sm text-slate mt-3 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <Photo k="siteWalkthrough" className="aspect-[4/3]" sizes="(min-width: 1024px) 50vw, 100vw" />
          <div>
            <Heading eyebrow="Related work" title="Choose the path that matches the job." />
            <ul className="space-y-3 text-sm">
              <Check><Link href="/rental-turnovers" className="underline">Unit turnovers</Link> — make-ready between tenants, not a change of standard.</Check>
              <Check><Link href="/general-contracting" className="underline">General contracting</Link> — how multi-trade work is managed.</Check>
              <Check><Link href="/home-renovations" className="underline">Home renovations</Link> — owner-occupied residential work, separate from rental operations.</Check>
              <Check><Link href="/services" className="underline">Individual trades</Link> — painting, flooring, kitchens, baths and carpentry à la carte.</Check>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <Heading eyebrow="Guides" title="How we expect a scope to be written." />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["/resources/commercial-landlord-renovation-scope", "Commercial landlord renovation scope"],
            ["/resources/maintenance-vs-capital-improvements", "Maintenance vs. capital improvements"],
            ["/resources/comparing-multiple-trade-bids", "Comparing multiple trade bids"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="card p-6 hover:border-bronze">
              <p className="text-navy font-semibold">{label}</p>
              <p className="text-sm text-slate mt-2">Read the guide →</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <Heading eyebrow="FAQ" title="Renovation questions owners ask first." />
        <Faq items={faq} />
        <FaqJsonLd items={faq} />
      </Section>
      <CtaBand title="Request a written renovation scope." primary={site.pathways[1]} secondary={site.pathways[2]} />
    </>
  );
}
