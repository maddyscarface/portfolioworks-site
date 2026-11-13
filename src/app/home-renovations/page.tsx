import { AudienceTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Home Renovation Contractor | Kitchens, Baths & Whole-Home | PortfolioWorks",
  description: "Residential owner renovations run as a managed project: written line-item scope, one coordinator, licensed trades where required.",
  path: "/home-renovations",
  image: "/photos/kitchen-renovated.jpg",
});
export default function Page() {
  return <AudienceTemplate id="homeowner" />;
}
