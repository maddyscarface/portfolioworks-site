import Link from "next/link";
import { accountOwners, accountProjects, accountProperties, demoData, type Project } from "@/lib/portal-data";
import { getService } from "@/config/services";
import { Btn, Container, PageHero, Section } from "@/components/ui";
import { flags } from "@/config/flags";
import { site } from "@/config/site";

export const metadata = { title: "Client Portal | PortfolioWorks", robots: { index: false } };

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const stageLabel: Record<string, string> = { requested: "Requested", estimating: "Estimating", proposal: "Proposal ready", approved: "Approved", scheduled: "Scheduled", "in-progress": "In progress", "punch-list": "Punch list", complete: "Complete", invoiced: "Invoiced", paid: "Paid" };
const stagePct: Record<string, number> = { requested: 5, estimating: 10, proposal: 15, approved: 25, scheduled: 30, "in-progress": 60, "punch-list": 90, complete: 100, invoiced: 100, paid: 100 };

/**
 * PROTOTYPE. In production the account comes from the authenticated session
 * (see docs/12-portal-and-operations.md). The ?acct switcher exists only to demo
 * that each account sees exclusively its own properties.
 */
export default async function Portal({ searchParams }: { searchParams: Promise<{ acct?: string }> }) {
  // Phase 2: the demo-data prototype is hidden unless NEXT_PUBLIC_PORTAL_PREVIEW=true (never on production).
  if (!flags.portalPreview) return <PortalHolding />;
  const { acct } = await searchParams;
  const account = demoData.accounts.find((a) => a.id === acct) ?? demoData.accounts[0];
  const props = accountProperties(account.id);
  const projects = accountProjects(account.id);
  const owners = accountOwners(account.id);
  const active = projects.filter((p) => !["paid", "complete"].includes(p.stage));
  const pendingCO = projects.flatMap((p) => p.changeOrders.filter((c) => c.status === "pending").map((c) => ({ ...c, project: p })));
  const proposals = projects.filter((p) => p.stage === "proposal");
  const invoices = projects.flatMap((p) => p.invoices.map((i) => ({ ...i, project: p.id })));
  const propOf = (p: Project) => props.find((x) => x.id === p.propertyId)!;

  return (
    <div className="bg-paper min-h-screen">
      <div className="bg-bronze-soft border-b border-line text-xs text-charcoal">
        <Container className="py-2 flex flex-wrap gap-3 items-center justify-between">
          <span><b>Prototype with demo data.</b> Authentication is not connected. Switch demo account:</span>
          <span className="flex gap-2">
            {demoData.accounts.map((a) => (
              <Link key={a.id} href={`/portal?acct=${a.id}`} className={`px-2 py-0.5 border ${a.id === account.id ? "bg-navy text-paper border-navy" : "border-line bg-white"}`}>{a.name.replace(" (demo)", "")}</Link>
            ))}
          </span>
        </Container>
      </div>
      <Container className="py-10">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className="eyebrow">Client portal</p>
            <h1 className="text-3xl sm:text-4xl text-navy mt-1">{account.name}</h1>
            <p className="text-slate text-sm mt-1">{props.length} properties · {props.reduce((s, p) => s + p.units, 0)} units · {owners.length} owner entities</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-ghost text-navy !py-2 text-sm" disabled title="Prototype">+ Add property</button>
            <button className="btn btn-ghost text-navy !py-2 text-sm" disabled title="Prototype">+ Add unit</button>
            <Link href="/request-a-turnover" className="btn btn-primary !py-2 text-sm">Request a scope</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[["Active projects", active.length], ["Proposals to review", proposals.length], ["Change orders pending", pendingCO.length], ["Open invoices", invoices.filter((i) => i.status !== "paid").length]].map(([l, v]) => (
            <div key={l as string} className="card p-5"><p className="text-xs text-slate">{l}</p><p className="num text-3xl text-navy mt-1">{v}</p></div>
          ))}
        </div>

        {(pendingCO.length > 0 || proposals.length > 0) && (
          <div className="mt-8 card border-bronze p-5">
            <p className="font-semibold text-navy mb-3">Needs your approval</p>
            {proposals.map((p) => (
              <div key={p.id} className="flex flex-wrap justify-between gap-3 py-2 border-t border-line text-sm">
                <span><span className="num text-bronze mr-2">{p.id}</span>Proposal — {p.title} · {propOf(p).address}</span>
                <span className="flex gap-2 items-center"><b>{usd(p.estimate)}</b><button className="btn btn-dark !py-1.5 !px-3 text-xs" disabled>Review & approve</button></span>
              </div>
            ))}
            {pendingCO.map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between gap-3 py-2 border-t border-line text-sm">
                <span><span className="num text-bronze mr-2">{c.id}</span>Change order on {c.project.id}: {c.description}</span>
                <span className="flex gap-2 items-center"><b>{usd(c.amount)}</b><button className="btn btn-dark !py-1.5 !px-3 text-xs" disabled>Approve</button><button className="btn btn-ghost !py-1.5 !px-3 text-xs" disabled>Decline</button></span>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-2xl text-navy mt-12 mb-4">Projects</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-xs text-slate"><tr><th className="p-3">Project</th><th className="p-3">Property / unit</th><th className="p-3">Service</th><th className="p-3">Stage</th><th className="p-3">Due</th><th className="p-3">Photos</th><th className="p-3 text-right">Contract</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="p-3"><span className="num text-bronze">{p.id}</span><br />{p.title}</td>
                  <td className="p-3">{propOf(p).address}, {propOf(p).city}<br /><span className="text-slate">{p.unit}</span></td>
                  <td className="p-3">{getService(p.service)?.name}</td>
                  <td className="p-3 min-w-36">{stageLabel[p.stage]}<div className="h-1.5 bg-paper-2 mt-1.5"><div className="h-1.5 bg-navy" style={{ width: `${stagePct[p.stage]}%` }} /></div>
                    {p.punch.length > 0 && <p className="text-xs text-slate mt-1">Punch {p.punch.filter((x) => x.done).length}/{p.punch.length}</p>}</td>
                  <td className="p-3 whitespace-nowrap">{p.due}</td>
                  <td className="p-3 text-xs">Before {p.photos.before} · After {p.photos.after}</td>
                  <td className="p-3 text-right num">{p.contractValue ? usd(p.contractValue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-10">
          <div>
            <h2 className="text-2xl text-navy mb-4">Properties</h2>
            <div className="space-y-2">
              {props.map((p) => (
                <div key={p.id} className="card p-4 flex justify-between text-sm">
                  <span><b className="text-navy">{p.address}</b>, {p.city}<br /><span className="text-slate">Owner: {owners.find((o) => o.id === p.ownerId)?.name} · built {p.yearBuilt}{p.yearBuilt < 1978 ? " · pre-1978 (lead-safe)" : ""}</span></span>
                  <span className="text-right">{p.units} units<br /><button className="text-bronze text-xs underline" disabled>Request repeat service</button></span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl text-navy mb-4">Invoices</h2>
            <div className="card divide-y divide-line text-sm">
              {invoices.map((i) => (
                <div key={i.id} className="p-4 flex justify-between"><span><span className="num">{i.id}</span> · {i.project} · {i.date}</span><span className="flex gap-3"><b>{usd(i.amount)}</b><span className={i.status === "paid" ? "text-ok" : "text-warn"}>{i.status}</span></span></div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function PortalHolding() {
  return (
    <>
      <PageHero image="scopePlanning" eyebrow="Client access" title="Project records for active clients." sub="Active PortfolioWorks clients receive estimates, approvals, progress photos and completion records directly from their coordinator. Online account access is being prepared and will be offered to clients first." />
      <Section tone="white">
        <div className="max-w-2xl">
          <p className="text-lg text-slate leading-relaxed">Already working with us and need a document? Email <a className="text-navy underline decoration-bronze underline-offset-4" href={`mailto:${site.email}`}>{site.email}</a> with the property address and we&apos;ll send it over.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href={site.ctas.primary.href}>{site.ctas.primary.label}</Btn>
            <Btn href="/contact" variant="ghost">Contact a coordinator</Btn>
          </div>
        </div>
      </Section>
    </>
  );
}
