import { AudienceTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Contractor for Small Landlords | PortfolioWorks",
  description: "One reliable contractor for landlords with 1–10 units: fast turnovers, repairs between tenants and clear line-item estimates.",
  path: "/landlords",
});
export default function Page() {
  return <AudienceTemplate id="landlord" />;
}
