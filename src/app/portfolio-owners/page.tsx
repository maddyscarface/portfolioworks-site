import { AudienceTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Contracting for Portfolio Owners | PortfolioWorks",
  description: "Repeatable turnover scopes, consistent pricing, coordinated crews and portfolio reporting for rental owners with growing unit counts.",
  path: "/portfolio-owners",
});
export default function Page() {
  return <AudienceTemplate id="portfolio-owner" />;
}
