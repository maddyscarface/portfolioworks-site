import { Heading, PageHero, Section } from "@/components/ui";
import { VacancyCalculator, PortfolioPlanner } from "@/components/Tools";
export const metadata = {
  title: "Vacancy Cost Calculator & Portfolio Improvement Planner | PortfolioWorks",
  description: "Estimate the gross rent equivalent of vacancy days and plan annual turnover volume, budget and scheduling across your portfolio.",
  alternates: { canonical: "/portfolio-savings-calculator" },
};
export default function Page() {
  return (
    <>
      <PageHero image="scopePlanning" eyebrow="Tools · Vacancy cost & portfolio planning" title="Put a number on vacancy—and a plan on the year." sub="Two planning tools for owners and managers. Every assumption is labeled; nothing here is a promise of rent or a guarantee of results." />
      <Section tone="paper" id="vacancy">
        <Heading eyebrow="Tool B" title="Vacancy cost calculator" sub="Compare the gross rent equivalent of your current renovation timeline against an accelerated one." />
        <VacancyCalculator />
      </Section>
      <Section tone="white" id="planner">
        <Heading eyebrow="Tool C" title="Portfolio improvement planner" sub="Estimate annual turnover volume, quarterly workload and indicative project categories." />
        <PortfolioPlanner />
      </Section>
    </>
  );
}
