import { FunnelTemplate } from "@/components/templates";
import { funnels } from "@/config/funnels";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Request a Turnover | PortfolioWorks",
  description: funnels["rental-turnover"].description,
  path: "/request-a-turnover",
});
export default function Page() {
  return <FunnelTemplate c={{ ...funnels["rental-turnover"], eyebrow: "Request a turnover" }} />;
}
