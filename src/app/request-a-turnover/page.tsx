import { FunnelTemplate } from "@/components/templates";
import { funnels } from "@/config/funnels";
export const metadata = { title: "Request a Turnover | PortfolioWorks", description: funnels["rental-turnover"].description, alternates: { canonical: "/request-a-turnover" } };
export default function Page() {
  return <FunnelTemplate c={{ ...funnels["rental-turnover"], eyebrow: "Request a turnover" }} />;
}
