import { pageGuard } from "@/lib/p4/admin-page";
import { reports } from "@/lib/p4/admin-data";
import { Card, Forbidden, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Reports" };

export default async function Page() {
  const { allowed } = await pageGuard("reports.read");
  if (!allowed) return <Forbidden perm="reports.read" />;
  const r = await reports();
  const T = ({ t, d }: { t: string; d: [string, number][] }) => <Card title={t}><Table head={["", "Count"]} rows={d.slice(0, 12).map(([k, v]) => [k, String(v)])} /></Card>;
  const f = r.walkthroughFunnel;
  return (
    <>
      <PageTitle title="Reports" sub="Operational counts from first-party data. Revenue, CAC and close-rate need ad spend and GHL opportunity data (see docs/12-dashboards-kpis.md); nothing here is estimated." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Leads (30 days)", r.leads30], ["Leads (all)", r.leadsTotal], ["Walkthroughs submitted", f.submitted], ["Proposals exported", f.exported]].map(([k, v]) => <Card key={String(k)}><p className="text-xs font-semibold tracking-wide text-stone uppercase">{k}</p><p className="mt-1 font-display text-3xl">{String(v)}</p></Card>)}
      </div>
      <Card title="Walkthrough funnel" className="mb-5"><Table head={["Stage", "Projects", "Of requested"]} rows={[["Requested", f.requested], ["Started", f.started], ["Submitted", f.submitted], ["Proposal exported", f.exported]].map(([k, v]) => [String(k), String(v), f.requested ? `${Math.round((Number(v) / f.requested) * 100)}%` : "—"])} /></Card>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <T t="Leads by source (30d)" d={r.leadsBySource} /><T t="Leads by service (30d)" d={r.leadsByService} /><T t="Projects by status" d={r.projectsByStatus} /><T t="Projects by service" d={r.projectsByService} /><T t="Outbox by status" d={r.outboxByStatus} />
      </div>
    </>
  );
}
