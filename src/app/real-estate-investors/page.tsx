import { AudienceTemplate } from "@/components/templates";
import { getAudience } from "@/config/audiences";
import { Section, Heading, Check, Btn } from "@/components/ui";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Investor Rehab & Value-Add Contractor | PortfolioWorks",
  description: "Executable rehab scopes, unit renovation programs, capex planning and cost-per-unit controls for value-add investors, plus pre-listing scopes for brokers.",
  path: "/real-estate-investors",
});
export default function Page() {
  const b = getAudience("broker");
  return (
    <AudienceTemplate
      id="investor"
      extra={
        <Section tone="paper2" id="brokers">
          <div className="grid lg:grid-cols-2 gap-12">
            <Heading eyebrow={b.label} title={b.headline} sub={b.sub} />
            <div>
              <ul className="space-y-3">{b.needs.map((n) => <Check key={n}>{n}</Check>)}</ul>
              <p className="text-xs text-slate mt-4">{b.faq[0].a}</p>
              <Btn href={b.cta.href} className="mt-6">{b.cta.label}</Btn>
            </div>
          </div>
        </Section>
      }
    />
  );
}
