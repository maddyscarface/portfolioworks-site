import { PageHero, Section } from "@/components/ui";
import { TurnoverEstimator } from "@/components/Tools";
export const metadata = {
  title: "Unit Turnover Cost Estimator | PortfolioWorks",
  description: "Get a preliminary cost range and schedule considerations for a rental unit turnover. Not a quote—submit the unit for a written scope.",
  alternates: { canonical: "/unit-turn-estimator" },
};
export default function Page() {
  return (
    <>
      <PageHero image="measuringDetail" eyebrow="Tool · Unit Turnover Cost Estimator" title="What will this turn cost?" sub="Set the unit details and scope. You'll see an illustrative line-item range from our internal price sheets plus scheduling considerations for your move-in date." />
      <Section tone="paper"><TurnoverEstimator /></Section>
    </>
  );
}
