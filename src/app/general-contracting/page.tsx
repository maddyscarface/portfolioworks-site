import { Check, CtaBand, Heading, PageHero, Section, Btn } from "@/components/ui";

export const metadata = {
  title: "General Contracting for Rental & Multifamily Property | PortfolioWorks",
  description: "Residential general contracting for rental owners: fixed-price, time-and-materials and cost-plus agreements with written change-order control.",
  alternates: { canonical: "/general-contracting" },
};

export default function Page() {
  return (
    <>
      <PageHero eyebrow="General contracting" title="One contract. One accountable party. Every trade." sub="For renovations that span multiple trades, permits and inspections, PortfolioWorks contracts the whole scope and manages it to closeout.">
        <Btn href="/request-a-renovation-estimate">Request a Renovation Estimate</Btn>
      </PageHero>
      <Section tone="white">
        <Heading eyebrow="Contract structures" title="The right agreement for the scope" />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Fixed price", "Definable scopes: turnovers, unit upgrades, kitchens, baths.", ["Price set before work starts", "Changes by signed change order only", "Best for repeatable work"]],
            ["Time & materials", "Diagnostic or uncertain work: leaks, hidden damage, small repair lists.", ["Published labor rates and material markup", "Not-to-exceed cap", "Daily logs and receipts"]],
            ["Cost-plus with GMP", "Complex rehabs where conditions are unknown until opened up.", ["Open-book costs plus disclosed fee", "Guaranteed maximum price", "Shared-savings option"]],
          ].map(([t, d, items]) => (
            <div key={t as string} className="card p-7">
              <h3 className="text-2xl text-navy">{t as string}</h3>
              <p className="text-slate text-sm mt-2">{d as string}</p>
              <ul className="mt-5 space-y-2 text-sm">{(items as string[]).map((x) => <Check key={x}>{x}</Check>)}</ul>
            </div>
          ))}
        </div>
      </Section>
      <Section tone="paper">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <Heading eyebrow="Change-order control" title="No work outside the scope without your signature." />
            <ol className="space-y-3 text-sm">
              {["Condition discovered and photographed", "Written change order: description, price, schedule impact", "Approved by the authorized approver (thresholds set per account)", "Work proceeds; change order attached to the project record and invoice"].map((x, i) => (
                <li key={x} className="flex gap-3"><span className="num text-bronze">{i + 1}.</span>{x}</li>
              ))}
            </ol>
          </div>
          <div>
            <Heading eyebrow="Trust & credentials" title="Verified, documented, state by state." />
            <ul className="space-y-2.5 text-sm">
              {["Written proposals and scopes of work", "Licensed subcontractors where required, credentials on file per job", "Certificates of insurance available on request", "Permits pulled by the party required to pull them", "License numbers published per state once verified—a license in one state never implies authority in another"].map((x) => <Check key={x}>{x}</Check>)}
            </ul>
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
