import { CtaBand, Heading, PageHero, Section, Btn } from "@/components/ui";

export const metadata = { title: "How It Works | PortfolioWorks", description: "From request to closeout: intake, scope, written estimate, sequenced execution, punch list and completion record.", alternates: { canonical: "/how-it-works" } };

const steps = [
  ["Request", "Submit the property and unit through the website, portal or email. Add photos, access notes and your target date.", "Intake record created; coordinator assigned."],
  ["Assess", "Photo-based review or on-site walkthrough. Conditions documented room by room.", "Condition report with photos."],
  ["Scope & estimate", "Line-item scope with quantities, allowances, exclusions and schedule.", "Written estimate you can approve in full or by line."],
  ["Approve & schedule", "Signed approval locks scope and price; trades are booked in sequence.", "Schedule with milestones; tenant/access plan."],
  ["Execute", "Coordinator manages trades, materials and inspections. Milestone updates by text/email and in the portal.", "Progress photos; change orders if conditions differ."],
  ["Punch & close", "Punch walk, corrections, final clean and after photos.", "Completion record + invoice tied to approved scope."],
  ["Repeat", "Your property record carries colors, products and history to the next job.", "Faster scoping next time."],
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="How it works" title="We Handle the Hard Part." sub="Every job—one repair list or a full rehab—runs through the same seven-step system.">
        <Btn href="/request-a-property-walkthrough">Get a Property Project Plan</Btn>
      </PageHero>
      <Section tone="white">
        <div className="border-t border-line">
          {steps.map(([t, d, out], i) => (
            <div key={t} className="grid md:grid-cols-[4rem_1fr_1.4fr_1fr] gap-4 py-6 border-b border-line items-start">
              <span className="num text-3xl text-bronze">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-2xl text-navy">{t}</h2>
              <p className="text-slate">{d}</p>
              <p className="text-sm bg-paper px-3 py-2 border-l-2 border-bronze"><span className="text-xs text-slate block">You receive</span>{out}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section tone="paper">
        <Heading eyebrow="Communication standard" title="You always know where the job stands." />
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          {[["Milestone notices", "Scheduled, started, punch list, complete—sent automatically."], ["One coordinator", "A named person owns your project from intake to invoice."], ["Portal record", "Estimates, approvals, photos, change orders and invoices in one place."]].map(([t, d]) => (
            <div key={t} className="card p-6"><p className="font-semibold text-navy">{t}</p><p className="text-slate mt-2">{d}</p></div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
