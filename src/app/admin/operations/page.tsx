import { demoData, margin, STAGES } from "@/lib/portal-data";
import { integrationStatus, listLeads } from "@/lib/integrations";
import { Container } from "@/components/ui";
import { pageGuard } from "@/lib/p4/admin-page";
import { Forbidden } from "@/components/admin/ui";

export const metadata = { title: "Operations Dashboard | PortfolioWorks", robots: { index: false } };
export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Phase 3 operations / margin PROTOTYPE (demo data). Phase 4: moved here and gated to reports.financial (owner). */
export default async function Admin() {
  const { allowed } = await pageGuard("reports.financial");
  if (!allowed) return <Forbidden perm="reports.financial" />;
  const projects = demoData.projects;
  const props = demoData.properties;
  const leads = await listLeads().catch(() => [] as Record<string, unknown>[]);
  const status = integrationStatus();
  const today = new Date("2026-11-02");
  const totals = projects.reduce(
    (a, p) => {
      const m = margin(p);
      return { rev: a.rev + m.revenue, cost: a.cost + m.cost, co: a.co + p.changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0) };
    },
    { rev: 0, cost: 0, co: 0 },
  );
  const byStage = STAGES.map((s) => ({ s, n: projects.filter((p) => p.stage === s).length }));
  const prop = (id: string) => props.find((p) => p.id === id)!;
  const acct = (id: string) => demoData.accounts.find((a) => a.id === prop(id).accountId)!.name.replace(" (demo)", "");

  return (
    <div className="bg-paper min-h-screen">
      <div className="bg-bronze-soft border-b border-line text-xs"><Container className="py-2"><b>Operations dashboard prototype.</b> Project and subcontractor rows are demo data; the leads table reads live from the lead store.</Container></div>
      <Container className="py-10 space-y-10">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="text-3xl sm:text-4xl text-navy">Operations & margin</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[["Contract value", usd(totals.rev)], ["Forecast cost", usd(totals.cost)], ["Gross margin", usd(totals.rev - totals.cost)], ["GM %", pct((totals.rev - totals.cost) / totals.rev)], ["Approved change orders", usd(totals.co)]].map(([l, v]) => (
            <div key={l} className="card p-5"><p className="text-xs text-slate">{l}</p><p className="num text-2xl text-navy mt-1">{v}</p></div>
          ))}
        </div>

        <div className="card p-5">
          <p className="font-semibold text-navy text-sm mb-3">Pipeline by stage</p>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-center text-xs">
            {byStage.map(({ s, n }) => <div key={s} className={`p-2 ${n ? "bg-navy text-paper" : "bg-paper-2 text-slate"}`}><p className="num text-xl">{n}</p><p className="mt-1">{s}</p></div>)}
          </div>
        </div>

        <section>
          <h2 className="text-2xl text-navy mb-3">Active projects</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-2 text-left text-xs text-slate"><tr><th className="p-3">Project</th><th className="p-3">Client</th><th className="p-3">Stage</th><th className="p-3">Contract</th><th className="p-3">PM / subs</th><th className="p-3">Due</th><th className="p-3 text-right">Est.</th><th className="p-3 text-right">Contract+CO</th><th className="p-3 text-right">Cost to date</th><th className="p-3 text-right">Forecast</th><th className="p-3 text-right">GM %</th><th className="p-3">Flags</th></tr></thead>
              <tbody>
                {projects.map((p) => {
                  const m = margin(p);
                  const days = Math.round((new Date(p.due).getTime() - today.getTime()) / 86400000);
                  const flags = [
                    days < 3 && !["paid", "complete", "invoiced"].includes(p.stage) ? `due ${days}d` : null,
                    m.gmPct && m.gmPct < 0.25 ? "low margin" : null,
                    p.changeOrders.some((c) => c.status === "pending") ? "CO pending" : null,
                    p.punch.some((x) => !x.done) && p.stage === "punch-list" ? "punch open" : null,
                  ].filter(Boolean);
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="p-3"><span className="num text-bronze">{p.id}</span><br /><span className="text-xs">{p.title}</span></td>
                      <td className="p-3 text-xs">{acct(p.propertyId)}<br />{prop(p.propertyId).address}</td>
                      <td className="p-3">{p.stage}</td>
                      <td className="p-3 text-xs">{p.contractType}</td>
                      <td className="p-3 text-xs">{p.pm}<br />{p.subs.length} subs</td>
                      <td className="p-3 whitespace-nowrap text-xs">{p.due}</td>
                      <td className="p-3 text-right num">{usd(p.estimate)}</td>
                      <td className="p-3 text-right num">{m.revenue ? usd(m.revenue) : "—"}</td>
                      <td className="p-3 text-right num">{usd(p.costToDate)}</td>
                      <td className="p-3 text-right num">{usd(p.forecastCost)}</td>
                      <td className="p-3 text-right num">{m.revenue ? pct(m.gmPct) : "—"}</td>
                      <td className="p-3 text-xs">{flags.map((f) => <span key={f} className="inline-block bg-bronze-soft text-warn px-1.5 py-0.5 mr-1 mb-1">{f}</span>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-2xl text-navy mb-3">Subcontractor performance</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-paper-2 text-left text-xs text-slate"><tr><th className="p-3">Sub</th><th className="p-3">Trade</th><th className="p-3">On-time</th><th className="p-3">Callbacks</th><th className="p-3">COI expires</th><th className="p-3">Active</th></tr></thead>
                <tbody>
                  {demoData.subcontractors.map((s) => {
                    const coiDays = Math.round((new Date(s.coiExpires).getTime() - today.getTime()) / 86400000);
                    return (
                      <tr key={s.id} className="border-t border-line">
                        <td className="p-3">{s.name}</td><td className="p-3 text-xs">{s.trade}</td><td className="p-3 num">{pct(s.onTimeRate)}</td><td className="p-3 num">{pct(s.callbackRate)}</td>
                        <td className={`p-3 text-xs ${coiDays < 45 ? "text-warn font-semibold" : ""}`}>{s.coiExpires}{coiDays < 45 ? ` (${coiDays}d)` : ""}</td><td className="p-3 num">{s.activeJobs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="text-2xl text-navy mb-3">Integrations</h2>
            <div className="card divide-y divide-line text-sm">
              {Object.entries(status).map(([k, v]) => (
                <div key={k} className="p-3 flex justify-between"><span>{k}</span><span className={v ? "text-ok" : "text-warn"}>{v ? "credentials set — validate" : "not configured"}</span></div>
              ))}
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-2xl text-navy mb-3">Recent website leads <span className="text-sm text-slate font-normal">({leads.length})</span></h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-2 text-left text-xs text-slate"><tr><th className="p-3">Received</th><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Funnel</th><th className="p-3">Market</th><th className="p-3">Units</th><th className="p-3">Score</th><th className="p-3">Pipeline</th><th className="p-3">Source</th></tr></thead>
              <tbody>
                {leads.length === 0 && <tr><td className="p-4 text-slate" colSpan={9}>No leads yet.</td></tr>}
                {leads.map((l) => {
                  const x = l as Record<string, never> & { score: { score: number; tier: string; market: string | null }; attribution: Record<string, string> };
                  return (
                    <tr key={String(x.eventId)} className="border-t border-line">
                      <td className="p-3 text-xs">{String(x.receivedAt).slice(0, 16).replace("T", " ")}</td>
                      <td className="p-3">{x.firstName} {x.lastName}<br /><span className="text-xs text-slate">{x.company}</span></td>
                      <td className="p-3 text-xs">{x.customerType}</td><td className="p-3 text-xs">{x.funnel}</td><td className="p-3 text-xs">{x.score.market ?? "out"}</td>
                      <td className="p-3 num">{x.units}</td><td className="p-3"><span className="num">{x.score.score}</span> <span className="text-xs">{x.score.tier}</span></td>
                      <td className="p-3 text-xs">{x.pipeline}</td><td className="p-3 text-xs">{x.attribution?.utm_source ?? "direct"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </div>
  );
}
