import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { serviceChoices } from "@/lib/walkthrough/choices";
import { OUTCOME_LABELS, type Outcome } from "@/lib/walkthrough/capture";
import { A, Badge, Card, Forbidden, PageTitle, Table, statusTone, when } from "@/components/admin/ui";
import { NewProjectForm } from "@/components/admin/ProjectForms";

export const metadata = { title: "Projects" };

type Cust = { first_name?: string; last_name?: string; zip?: string; town?: string };
const who = (p: Record<string, unknown>) => { const c = (p.customer ?? {}) as Cust; return [c.first_name, c.last_name].filter(Boolean).join(" ") || String(p.id); };
const svc = (id: unknown) => serviceChoices.find((s) => s.id === id)?.label ?? String(id ?? "");
const where = (p: Record<string, unknown>) => { const c = (p.customer ?? {}) as Cust; return [p.company, c.town, c.zip].filter(Boolean).join(" · "); };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { staff, allowed } = await pageGuard("projects.read");
  if (!allowed) return <Forbidden perm="projects.read" />;
  const all = await db.list("projects", BRAND, {}, { limit: 1000 });
  const rows = status ? all.filter((p) => p.status === status) : all;
  const queue = all.filter((p) => p.status === "walkthrough_submitted" || p.estimate_stale);
  return (
    <>
      <PageTitle title="Projects & walkthroughs" sub="Customer walkthroughs, measurement revisions and private estimates. Customers never see readiness, estimates or prices." />
      {can(staff, "projects.write", BRAND) && <Card title="New project (staff entered)" className="mb-5"><NewProjectForm services={serviceChoices} /></Card>}
      <Card title={`Review queue (${queue.length})`} className="mb-5">
        <Table head={["Project", "Service", "Submitted", "Suggested outcome", "Flags"]} rows={queue.map((p) => [<A key="a" href={`/admin/projects/${p.id}`}>{who(p)}</A>, svc(p.service) + (p.units_declared ? ` · ${p.units_declared} unit(s)` : ""), when(p.updated_at), (p.readiness as { outcome?: Outcome } | null)?.outcome ? OUTCOME_LABELS[(p.readiness as { outcome: Outcome }).outcome] : "—", p.estimate_stale ? <Badge key="s" tone="warn">estimate stale</Badge> : ""])} empty="Nothing waiting for review." />
      </Card>
      <Card title={`All projects (${rows.length})`}>
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">{["", ...new Set(all.map((p) => String(p.status)))].map((s) => <a key={s} href={s ? `/admin/projects?status=${s}` : "/admin/projects"} className={`rounded-full border px-2.5 py-1 ${status === s || (!status && !s) ? "border-char bg-char text-white" : "border-line"}`}>{s || "all"}</a>)}</div>
        <Table head={["Project", "Customer", "Service", "Status", "Revision", "Created"]} rows={rows.map((p) => [<A key="a" href={`/admin/projects/${p.id}`}>{p.id}</A>, [who(p), where(p)].filter(Boolean).join(" · "), svc(p.service), <Badge key="b" tone={statusTone(String(p.status))}>{String(p.status)}</Badge>, String(p.current_revision_no ?? 0), when(p.created_at)])} />
      </Card>
    </>
  );
}
