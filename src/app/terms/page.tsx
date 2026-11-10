import { site } from "@/config/site";
import { Container } from "@/components/ui";

export const metadata = { title: "Terms of Use | PortfolioWorks", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <section className="py-16 bg-white">
      <Container className="max-w-3xl text-[0.95rem] leading-relaxed space-y-4">
        <p className="eyebrow">Draft — requires legal review before launch</p>
        <h1 className="text-4xl text-navy">Terms of Use</h1>
        <h2 className="text-2xl text-navy pt-4">Website information</h2>
        <p>Content on this site is general information about {site.legalName}&apos;s services. Service availability varies by market and is confirmed in writing.</p>
        <h2 className="text-2xl text-navy pt-4">Estimators and calculators</h2>
        <p>The Unit Turnover Cost Estimator, Vacancy Cost Calculator and Portfolio Improvement Planner produce illustrative, preliminary figures from internal assumptions. They are not quotes, bids, offers or contracts and do not guarantee any cost, schedule, tenant, lease date or rent.</p>
        <h2 className="text-2xl text-navy pt-4">No contract until signed</h2>
        <p>Submitting a request creates no obligation for either party. Work is performed only under a written proposal or contract signed by both parties, including any state-required terms.</p>
        <h2 className="text-2xl text-navy pt-4">Licensing</h2>
        <p>Licensed trade work is performed by appropriately licensed contractors. Licensing and registration are specific to each state; authorization in one state does not extend to another.</p>
        <h2 className="text-2xl text-navy pt-4">Portal</h2>
        <p>Portal users are responsible for keeping credentials secure and may only access properties assigned to their account.</p>
      </Container>
    </section>
  );
}
