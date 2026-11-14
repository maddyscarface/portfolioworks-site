import { pageGuard } from "@/lib/p4/admin-page";
import { search } from "@/lib/p4/admin-data";
import { A, Badge, Card, Forbidden, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Search" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { staff, allowed } = await pageGuard("leads.read");
  if (!allowed || !staff) return <Forbidden perm="leads.read" />;
  const r = await search(q, staff);
  return (
    <>
      <PageTitle title="Search" sub="Leads, projects and vendor prospects. Results respect your role (PII is masked without pii.read)." />
      <form className="mb-6 flex gap-2" action="/admin/search"><input name="q" defaultValue={q} className="field max-w-lg" placeholder="Name, email, town, ZIP, project id…" aria-label="Search" data-testid="admin-search" /><button className="btn btn-char">Search</button></form>
      {q && (
        <div className="grid gap-5">
          <Card title={`Website leads (${r.leads.length})`}><Table head={["Name", "Email", "Town", "Status", "Received"]} rows={r.leads.map((l) => [String(l.name || "—"), String(l.email ?? ""), String(l.town ?? ""), String(l.status ?? ""), String(l.created_at ?? "").slice(0, 10)])} /></Card>
          <Card title={`Projects (${r.projects.length})`}><Table head={["Project", "Customer", "Service", "Status"]} rows={r.projects.map((p) => [<A key="a" href={`/admin/projects/${p.id}`}>{p.id}</A>, `${p.name} · ${p.town}`, String(p.service), <Badge key="b">{String(p.status)}</Badge>])} /></Card>
          <Card title={`Vendor prospects (${r.prospects.length})`}><Table head={["Contact id", "Name", "City", "Status", "Data"]} rows={r.prospects.map((v) => [String(v.contact_id), v.name, String(v.city ?? ""), String(v.status), v.synthetic ? <Badge key="s" tone="warn">SYNTHETIC</Badge> : "DataMoon"])} /></Card>
        </div>
      )}
    </>
  );
}
