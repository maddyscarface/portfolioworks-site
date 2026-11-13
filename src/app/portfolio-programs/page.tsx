import { Check, CtaBand, Faq, FaqJsonLd, Heading, PageHero, Section, Btn, Breadcrumbs } from "@/components/ui";
import LeadForm from "@/components/LeadForm";
import { getService } from "@/config/services";
import { site } from "@/config/site";
import { JsonLd, pageMeta, serviceSchema, webPageSchema } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Portfolio Maintenance Programs | PortfolioWorks",
  description: "Explore planned maintenance and recurring renovation support for Boston-area property managers and landlords.",
  path: "/portfolio-programs",
  image: "/photos/boston-north-end.jpg",
});

const offers = [
  { n: "Offer 1", t: "Single-Unit Turnover", d: "One scope, one schedule, one project coordinator.", items: ["Walkthrough or photo intake", "Line-item fixed price", "Completion record"], href: "/request-a-turnover" },
  { n: "Offer 2", t: "Rental Rehab", d: "Full or partial renovation under an agreed scope and budget.", items: ["Detailed scope by room and trade", "Milestone schedule & payments", "Weekly photo reports"], href: "/request-a-renovation-estimate" },
  { n: "Offer 3", t: "Portfolio Partner", d: "Recurring maintenance, turnovers and renovation projects with centralized coordination.", items: ["Pilot unit to start", "Rate card + standard unit packages", "Reporting and owner-level invoicing", "Quarterly business reviews"], href: "#consultation" },
];

const governance = [
  { t: "Service-level expectations", d: "A program names how work is requested, who approves it, how quickly a coordinator responds in writing, and how closeout is delivered. Those are expectations we agree in a program document — not a public promise of emergency response or a fixed vacancy turnaround." },
  { t: "Unit volume", d: "Share typical annual turns, current backlogs and any seasonal peaks (including Boston’s September cycle). Volume informs a rate card and a pilot; it does not reserve crew capacity we have not staffed." },
  { t: "Location", d: "Active coverage is launched Greater Boston towns. Properties outside that list, or in Florida or Maine, are reviewed for availability and are not treated as active program territory." },
  { t: "Reporting", d: "Owners and managers should expect a shared record: open jobs, approved scopes, change orders, photo closeout and invoicing by property or entity. We do not publish client data or vacancy-reduction statistics." },
  { t: "Cost governance", d: "A rate card, standard unit packages and written change orders keep spend comparable from unit to unit. Approval thresholds can be set by user and owner. Estimator figures remain planning-only until a scope is approved." },
];

export default function Page() {
  const s = getService("property-maintenance")!;
  const path = "/portfolio-programs";
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            webPageSchema({ path, name: "Portfolio Maintenance Programs", description: "Planned maintenance and recurring renovation support for Boston-area property managers and landlords." }),
            serviceSchema({ name: "Portfolio maintenance programs", description: "Recurring turnovers, maintenance and renovation projects with centralized coordination.", path }),
          ],
        }}
      />
      <PageHero image="bostonNorthEnd" eyebrow="Portfolio programs · Greater Boston" title="Portfolio Maintenance Programs for Greater Boston Owners" sub="Recurring turnovers, planned maintenance and renovation support with agreed reporting and cost governance. We start with a consultation and a pilot unit — not a long contract and not a promise of capacity we have not staffed.">
        <Btn href="#consultation">{site.pathways[2].label}</Btn>
      </PageHero>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Portfolio programs", path }]} />
      <Section tone="white">
        <div className="grid md:grid-cols-3 gap-6">
          {offers.map((o, i) => (
            <div key={o.t} className={`p-8 ${i === 2 ? "bg-navy text-paper" : "card"}`}>
              <p className={`eyebrow ${i === 2 ? "!text-bronze-2" : ""}`}>{o.n}</p>
              <h2 className={`text-2xl mt-2 ${i === 2 ? "text-paper" : "text-navy"}`}>{o.t}</h2>
              <p className={`mt-3 ${i === 2 ? "text-paper/75" : "text-slate"}`}>{o.d}</p>
              <ul className="mt-5 space-y-2 text-sm">{o.items.map((x) => <Check key={x}>{x}</Check>)}</ul>
              <Btn href={o.href} variant={i === 2 ? "primary" : "ghost"} className="mt-7">Start</Btn>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate mt-6">À la carte pricing is always available: any single trade or line item can be ordered on its own.</p>
      </Section>
      <Section tone="paper">
        <Heading eyebrow="How a program is set up" title="Volume, location, reporting and cost governance." sub="These are the questions a consultation actually covers. We will not advertise an emergency response time or a guaranteed vacancy reduction." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {governance.map((g) => (
            <div key={g.t} className="card p-6">
              <h3 className="text-xl text-navy">{g.t}</h3>
              <p className="text-sm text-slate mt-3 leading-relaxed">{g.d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section tone="white">
        <Heading eyebrow="Partnership process" title="From discovery to recurring work" />
        <ol className="grid md:grid-cols-5 gap-4">
          {s.process.map((p, i) => (
            <li key={p.step} className="card p-5"><p className="num text-bronze">{i + 1}</p><p className="font-semibold text-navy mt-1">{p.step}</p><p className="text-sm text-slate mt-1">{p.detail}</p></li>
          ))}
        </ol>
      </Section>
      <Section tone="paper" id="consultation">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          <div>
            <Heading eyebrow="Consultation" title="Discuss a Portfolio Program" sub="Share your geography, doors, turn volume and current service gaps. We start with a consultation, and only then propose a pilot and rate card." />
            <Faq items={s.faq} />
            <FaqJsonLd items={s.faq} />
          </div>
          <LeadForm funnel="portfolio" defaultServices={["property-maintenance", "rental-turnovers"]} />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
