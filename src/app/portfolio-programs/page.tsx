import { Check, CtaBand, Faq, FaqJsonLd, Heading, PageHero, Section, Btn } from "@/components/ui";
import LeadForm from "@/components/LeadForm";
import { getService } from "@/config/services";

export const metadata = {
  title: "Portfolio Partner Programs for Owners & Property Managers | PortfolioWorks",
  description: "Recurring turnovers, maintenance and renovation projects with centralized coordination, a fixed rate card and a pilot unit to start.",
  alternates: { canonical: "/portfolio-programs" },
};

const offers = [
  { n: "Offer 1", t: "Single-Unit Turnover", d: "One scope, one schedule, one project coordinator.", items: ["Walkthrough or photo intake", "Line-item fixed price", "Completion record"], href: "/request-a-turnover" },
  { n: "Offer 2", t: "Rental Rehab", d: "Full or partial renovation under an agreed scope and budget.", items: ["Detailed scope by room and trade", "Milestone schedule & payments", "Weekly photo reports"], href: "/request-a-renovation-estimate" },
  { n: "Offer 3", t: "Portfolio Partner", d: "Recurring maintenance, turnovers and renovation projects with centralized coordination.", items: ["Pilot unit to start", "Rate card + standard unit packages", "Portal, thresholds, owner-level invoicing", "Quarterly business reviews"], href: "#consultation" },
];

export default function Page() {
  const s = getService("property-maintenance")!;
  return (
    <>
      <PageHero image="bostonNorthEnd" eyebrow="Portfolio programs" title="Your portfolio needs a system, not another contractor phone number." sub="Three ways to work with PortfolioWorks—from a single turnover to a recurring partnership—plus custom à la carte pricing whenever you need it.">
        <Btn href="#consultation">Request a Portfolio Partnership Consultation</Btn>
      </PageHero>
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
        <Heading eyebrow="Partnership process" title="From discovery to recurring work" />
        <ol className="grid md:grid-cols-5 gap-4">
          {s.process.map((p, i) => (
            <li key={p.step} className="card p-5"><p className="num text-bronze">{i + 1}</p><p className="font-semibold text-navy mt-1">{p.step}</p><p className="text-sm text-slate mt-1">{p.detail}</p></li>
          ))}
        </ol>
      </Section>
      <Section tone="white" id="consultation">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          <div>
            <Heading eyebrow="Consultation" title="Request a Portfolio Partnership Consultation" sub="Share your portfolio size, locations and current vendor challenges. We'll come to the call with a proposed pilot." />
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
