import { FunnelTemplate } from "@/components/templates";
import { funnels } from "@/config/funnels";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Request a Renovation Estimate | PortfolioWorks",
  description: funnels["value-add-rehab"].description,
  path: "/request-a-renovation-estimate",
});
export default function Page() {
  return <FunnelTemplate c={{ ...funnels["value-add-rehab"], eyebrow: "Request a renovation estimate" }} />;
}
