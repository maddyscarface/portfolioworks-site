import { FunnelTemplate } from "@/components/templates";
import { funnels } from "@/config/funnels";
export const metadata = { title: "Request a Renovation Estimate | PortfolioWorks", description: funnels["value-add-rehab"].description, alternates: { canonical: "/request-a-renovation-estimate" } };
export default function Page() {
  return <FunnelTemplate c={{ ...funnels["value-add-rehab"], eyebrow: "Request a renovation estimate" }} />;
}
