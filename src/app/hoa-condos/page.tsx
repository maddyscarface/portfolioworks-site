import { AudienceTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "HOA & Condo Association Contractor | Common Areas & Unit Work | PortfolioWorks",
  description: "Common-area repairs, unit-owner renovation coordination and association-ready vendor paperwork for HOAs and condo associations.",
  path: "/hoa-condos",
});
export default function Page() {
  return <AudienceTemplate id="hoa" />;
}
