import { FunnelTemplate } from "@/components/templates";
import { pageMeta } from "@/lib/seo";
export const metadata = pageMeta({
  title: "Request a Property Walkthrough | PortfolioWorks",
  description: "Get a property project plan that includes a walkthrough, condition notes and a written scope for turnovers, repairs or renovation.",
  path: "/request-a-property-walkthrough",
});
export default function Page() {
  return (
    <FunnelTemplate
      c={{
        funnel: "walkthrough",
        eyebrow: "Get a property project plan",
        offer: "Get a Property Project Plan.",
        sub: "We'll review the property, document conditions and turn them into a written plan—one unit or the whole building.",
        bullets: ["Condition walkthrough with photos", "Prioritized scope: safety, rent-ready, value-add", "Line-item pricing and schedule", "No obligation until you approve in writing"],
        proof: [
          { t: "Prioritized", d: "Safety and code items first, then turnover-critical, then value-add options." },
          { t: "Documented", d: "Every finding photographed and saved to your property record." },
          { t: "Actionable", d: "Approve the whole plan or individual line items." },
        ],
      }}
    />
  );
}
