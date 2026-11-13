import { AudienceTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Contracting for Portfolio Owners (10–100+ Units) | PortfolioWorks",
  description: "Repeatable turnover scopes, consistent pricing, multiple crews and portfolio reporting for growing rental owners.",
  path: "/portfolio-owners",
});
export default function Page() {
  return <AudienceTemplate id="portfolio-owner" />;
}
