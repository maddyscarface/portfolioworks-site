import { PageHero, Section, Breadcrumbs } from "@/components/ui";
import { TurnoverEstimator } from "@/components/Tools";
import { priceSheet } from "@/config/pricing";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Unit Turnover Cost Estimator | PortfolioWorks",
  description: "Get a preliminary cost range for a rental unit turnover. Figures are dated planning assumptions, not a quote or contractual bid.",
  path: "/unit-turn-estimator",
  image: "/photos/measuring-detail.jpg",
});
export default function Page() {
  return (
    <>
      <PageHero image="measuringDetail" eyebrow="Tool · Unit Turnover Cost Estimator" title="What will this turn cost?" sub={`${priceSheet.assumptionLabel} Set the unit details and scope to see an illustrative line-item range. Submit the unit for a written scope if you want a bid.`} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Unit turn estimator", path: "/unit-turn-estimator" }]} />
      <Section tone="paper"><TurnoverEstimator /></Section>
    </>
  );
}
