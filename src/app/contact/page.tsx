import { site } from "@/config/site";
import { PageHero, Section } from "@/components/ui";
import LeadForm from "@/components/LeadForm";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Contact PortfolioWorks",
  description: "Project requests, partnership inquiries, vendor applications and broker referrals for PortfolioWorks in Greater Boston.",
  path: "/contact",
  image: "/photos/site-walkthrough.jpg",
});

export default function Page() {
  return (
    <>
      <PageHero image="siteWalkthrough" eyebrow="Contact" title="Talk to a project coordinator." sub="Project requests, partnership inquiries, vendor/subcontractor applications and broker referrals." />
      <Section tone="paper">
        <div className="grid min-w-0 lg:grid-cols-[1fr_1.3fr] gap-12">
          <div className="min-w-0 space-y-6 text-sm">
            <div><p className="eyebrow mb-1">Email</p><p className="text-lg text-navy break-all"><a href={`mailto:${site.email}`}>{site.email}</a></p></div>
            {site.phone && <div><p className="eyebrow mb-1">Phone</p><p className="text-lg text-navy">{site.phone}</p></div>}
            <div><p className="eyebrow mb-1">Subcontractors & trades</p><p className="text-slate">Interested in joining our approved subcontractor network? Email us with your trade, service area, license and insurance details.</p></div>
          </div>
          <LeadForm funnel="contact" />
        </div>
      </Section>
    </>
  );
}
