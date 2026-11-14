import { PageHero, Section, Breadcrumbs } from "@/components/ui";
import { TurnoverEstimator } from "@/components/Tools";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Unit Turnover Scope Planner | PortfolioWorks",
  description: "Plan a rental unit turnover: pick the rooms and trades, check the service area and timing, then send it for a written scope. No prices online.",
  path: "/unit-turn-estimator",
  image: "/photos/measuring-detail.jpg",
});
export default function Page() {
  return (
    <>
      <PageHero image="measuringDetail" eyebrow="Tool · Unit Turnover Scope Planner" title="Plan the turn before you call." sub="Set the unit details and scope to see the trades involved, timing and access notes. We don't show prices online; submit the unit for a written scope and proposal." />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Unit turn scope planner", path: "/unit-turn-estimator" }]} />
      <Section tone="paper"><TurnoverEstimator /></Section>
    </>
  );
}
