import { AudienceTemplate } from "@/components/templates";
import { Section, Heading } from "@/components/ui";
export const metadata = {
  title: "General Contractor for Property Managers | PortfolioWorks",
  description: "One partner for repairs, turnovers and renovations across every owner you manage: easy work requests, approval thresholds, owner-separated invoicing.",
  alternates: { canonical: "/property-managers" },
};
export default function Page() {
  return (
    <AudienceTemplate
      id="property-manager"
      extra={
        <Section tone="paper2">
          <Heading eyebrow="Built for PM workflows" title="How work requests flow" />
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            {[
              ["Submit", "Portal, email or your work-order platform. Unit, issue, photos, access notes."],
              ["Scope & approve", "Estimate routed to the approver your thresholds require—your team or the owner."],
              ["Execute", "Tenant access coordinated through your team; status updates at each milestone."],
              ["Close & bill", "Completion photos and invoice issued to the correct owner entity."],
            ].map(([t, d], i) => (
              <div key={t} className="card p-5"><p className="num text-bronze">{i + 1}</p><p className="font-semibold text-navy mt-1">{t}</p><p className="text-slate mt-1">{d}</p></div>
            ))}
          </div>
        </Section>
      }
    />
  );
}
