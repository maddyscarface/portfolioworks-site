import Link from "next/link";
import { pageGuard } from "@/lib/p4/admin-page";
import { safeLeads } from "@/lib/p4/admin-data";
import { db, storageMode } from "@/lib/p4/db";
import { BRAND, flags } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { maskEmail } from "@/lib/p4/pii";
import { Badge, Card, Forbidden, PageTitle, Table, statusTone, when } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/** Phase 4 admin home: role-filtered overview. No prices or estimate totals appear here. */
export default async function Admin() {
  const { staff, allowed } = await pageGuard("leads.read");
  if (!allowed) return <Forbidden perm="leads.read" />;
  const pii = can(staff, "pii.read", BRAND);
  const f = flags();
  const { rows, error } = await safeLeads(1000);
  const d30 = rows.filter((r) => Date.now() - Date.parse(r.created_at) < 30 * 864e5);
  const projects = can(staff, "projects.read", BRAND) ? await db.list("projects", BRAND, {}, { limit: 500 }) : [];
  const outbox = can(staff, "crm.read", BRAND) ? await db.list("event_outbox", BRAND, {}, { limit: 1000 }) : [];
  const pending = outbox.filter((e) => e.status === "pending").length;
  const dead = outbox.filter((e) => e.status === "dead").length;
  const Tile = ({ k, v, s, href }: { k: string; v: string | number; s?: string; href?: string }) => {
    const body = <><p className="text-xs font-semibold uppercase tracking-wider text-stone">{k}</p><p className="mt-1 font-display text-3xl text-char">{v}</p>{s && <p className="text-xs text-stone">{s}</p>}</>;
    return href ? <Link href={href} className="block bg-white p-5 shadow-card hover:outline hover:outline-1 hover:outline-char">{body}</Link> : <div className="bg-white p-5 shadow-card">{body}</div>;
  };
  return (
    <>
      <PageTitle title="Dashboard" sub="Website leads, walkthrough projects and CRM delivery at a glance. Vendor prospects are kept separate from leads.">
        {can(staff, "reports.financial", BRAND) && <Link href="/admin/operations" className="btn btn-outline !min-h-9 !px-3 !text-sm">Operations prototype (demo data)</Link>}
      </PageTitle>
      {error && <p className="err mb-4">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-dashboard">
        <Tile k="Leads (30 days)" v={d30.length} s={`${rows.length} in store`} href="/admin/leads" />
        <Tile k="Walkthrough projects" v={projects.length} s={f.walkthrough ? "Mobile walkthrough ON" : "Mobile walkthrough OFF (flag)"} href="/admin/projects" />
        <Tile k="CRM outbox" v={`${pending} pending`} s={dead ? `${dead} dead-letter` : "no dead-letter events"} href="/admin/crm" />
        <Tile k="Storage" v={storageMode()} s={storageMode() === "supabase" ? "durable" : "not durable: dev/staging fallback"} href="/admin/integrations" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Latest website leads">
          <Table head={["Received", "Name", "Email", "Type", "Funnel", "Score"]} rows={rows.slice(0, 10).map((r) => [when(r.created_at), `${r.first_name ?? ""} ${r.last_name ?? ""}`, pii ? String(r.email ?? "") : String(maskEmail(String(r.email ?? ""))), String(r.customer_type ?? ""), r.funnel, String(r.lead_score ?? "")])} empty="No website leads in this store yet." />
        </Card>
        <Card title="Latest walkthrough projects">
          <Table head={["Created", "Service", "Status", "Customer"]} rows={projects.slice(0, 10).map((p) => [when(p.created_at), String(p.service), <Badge key="s" tone={statusTone(String(p.status))}>{String(p.status)}</Badge>, <Link key="l" className="underline" href={`/admin/projects/${p.id}`}>{String((p.customer as { first_name?: string })?.first_name ?? "Open")}</Link>])} empty="No walkthrough projects yet." />
        </Card>
      </div>
      <Card title="Feature flags (Phase 4)" className="mt-6">
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {([["Mobile walkthrough", f.walkthrough], ["Estimator (manual, private)", f.estimator], ["DataMoon", f.datamoon], ["DataMoon audience activation", f.datamoonActivation], ["DataMoon CRM sync", f.datamoonCrmSync], ["GHL internal pricing fields", f.ghlInternalPricingFields]] as [string, boolean][]).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-2 border border-line bg-white px-3 py-2"><span>{k}</span><Badge tone={v ? "good" : "neutral"}>{v ? "on" : "off"}</Badge></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone">Florida and Maine are not live markets. Native AR / measurement providers are disabled contracts only.</p>
      </Card>
    </>
  );
}
