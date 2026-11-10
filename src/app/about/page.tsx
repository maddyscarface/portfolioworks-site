import { founder, site } from "@/config/site";
import { Check, CtaBand, Heading, PageHero, Placeholder, Section } from "@/components/ui";

export const metadata = { title: "About PortfolioWorks | Founder & Approach", description: "PortfolioWorks was built by a rental owner and construction project manager to give landlords one accountable contractor.", alternates: { canonical: "/about" } };

export default function Page() {
  const ld = { "@context": "https://schema.org", "@type": "Person", name: founder.name, jobTitle: founder.title, worksFor: { "@type": "Organization", name: site.legalName }, alumniOf: ["Cornell University", "Worcester Polytechnic Institute"] };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero eyebrow="About" title={site.tagline} sub={site.supporting} />
      <Section tone="white">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12">
          <Placeholder label="Founder portrait" className="aspect-[4/5]" />
          <div>
            <Heading eyebrow={founder.title} title={founder.name} />
            {founder.bio.map((p) => <p key={p} className="text-slate leading-relaxed mb-4 text-lg">{p}</p>)}
            <p className="eyebrow mt-8 mb-3">Background</p>
            <ul className="space-y-2">{["Real estate development and rental ownership across Greater Boston", "Residential renovation and rehabilitation", "Multifamily project management", "Contractor coordination, budgeting and execution", ...founder.credentials.filter((c) => !c.includes("VERIFY"))].map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
        </div>
      </Section>
      <Section tone="paper">
        <Heading eyebrow="Operating principles" title="What we hold ourselves to" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[["Written before work", "No verbal scopes. Every job and change is documented."], ["Licensed where required", "Credentials for licensed trades verified per job and state."], ["Honest scheduling", "We commit to dates we can staff, and tell you early when that changes."], ["Records you own", "Photos, products and history belong to your property file."]].map(([t, d]) => (
            <div key={t} className="card p-6"><p className="font-semibold text-navy">{t}</p><p className="text-slate mt-2">{d}</p></div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
