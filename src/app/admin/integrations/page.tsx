import { pageGuard } from "@/lib/p4/admin-page";
import { integrationHealth } from "@/lib/p4/admin-data";
import { Badge, Card, Forbidden, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Integrations" };

export default async function Page() {
  const { allowed } = await pageGuard("integrations.read");
  if (!allowed) return <Forbidden perm="integrations.read" />;
  const h = integrationHealth();
  const tone = (s: string) => (/configured|on|API/i.test(s) && !/off/i.test(s) ? "good" : /fallback|log|webhook|not_connected/i.test(s) ? "warn" : "neutral") as "good" | "warn" | "neutral";
  return (
    <>
      <PageTitle title="Integration health" sub={`"Configured" means a value is present, not that the connection was tested. Storage mode: ${h.storage}.`} />
      <Card title="Core" className="mb-5"><Table head={["Integration", "State", "Notes"]} rows={h.rows.map((r) => [r.name, <Badge key="s" tone={tone(r.state)}>{r.state}</Badge>, r.detail])} /></Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="DataMoon (vendor)"><Table head={["Family", "Status"]} rows={[["Main", h.datamoon.main], ["Legacy", h.datamoon.legacy], ["Topic search", h.datamoon.topicSearch], ["Intent", h.datamoon.intent], ["Webhook", h.datamoon.webhook]].map(([k, v]) => [k, <Badge key="s" tone={tone(String(v))}>{String(v)}</Badge>])} /></Card>
        <Card title="Measurement providers (contracts only)"><Table head={["Provider", "Platform", "Available", "Why"]} rows={h.measurement.map((m) => [m.label, m.platform, m.capability.supported ? "yes" : "no", m.capability.reason])} /><p className="mt-2 text-xs text-stone">The mobile web walkthrough (photos, video, tape measurements) is the supported path. No AR accuracy is claimed.</p></Card>
      </div>
    </>
  );
}
