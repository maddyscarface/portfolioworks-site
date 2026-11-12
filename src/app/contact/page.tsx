import { site } from "@/config/site";
import { PageHero, Section } from "@/components/ui";
import LeadForm from "@/components/LeadForm";

export const metadata = { title: "Contact PortfolioWorks", alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <>
      <PageHero image="siteWalkthrough" eyebrow="Contact" title="Talk to a project coordinator." sub="Project requests, partnership inquiries, vendor/subcontractor applications and broker referrals." />
      <Section tone="paper">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12">
          <div className="space-y-6 text-sm">
            <div><p className="eyebrow mb-1">Email</p><p className="text-lg text-navy">{site.email}</p></div>
            {site.phone && <div><p className="eyebrow mb-1">Phone</p><p className="text-lg text-navy">{site.phone}</p></div>}
            <div><p className="eyebrow mb-1">Subcontractors & trades</p><p className="text-slate">Interested in joining our approved subcontractor network? Email us with your trade, service area, license and insurance details.</p></div>
          </div>
          <LeadForm funnel="contact" />
        </div>
      </Section>
    </>
  );
}
