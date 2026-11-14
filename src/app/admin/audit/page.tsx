import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { verifyAuditChain } from "@/lib/p4/audit";
import { Badge, Card, Forbidden, PageTitle, Table, when } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { allowed } = await pageGuard("audit.read");
  if (!allowed) return <Forbidden perm="audit.read" />;
  const rows = await db.list("audit_log", BRAND, {}, { limit: 1000 });
  const ok = verifyAuditChain(rows);
  const shown = q ? rows.filter((r) => JSON.stringify([r.actor, r.action, r.target_type, r.target_id]).toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <>
      <PageTitle title="Audit log" sub="Append-only and hash-chained. Prices, secrets and media are never written to audit details.">
        <Badge tone={ok ? "good" : "bad"}>{ok ? "Hash chain verified" : "Chain check failed"}</Badge>
      </PageTitle>
      <form className="mb-4 flex gap-2" action="/admin/audit"><input name="q" defaultValue={q} className="field max-w-sm" placeholder="Filter by actor, action, target" aria-label="Filter" /><button className="btn btn-char">Filter</button></form>
      <Card><Table head={["When", "Actor", "Role", "Action", "Target", "Detail"]} rows={shown.slice(0, 500).map((r) => [when(r.created_at), String(r.actor), String(r.role), String(r.action), `${r.target_type}${r.target_id ? `:${String(r.target_id).slice(0, 16)}` : ""}`, <code key="d" className="text-xs break-all">{JSON.stringify(r.detail ?? {}).slice(0, 160)}</code>])} empty="No audit entries." /></Card>
    </>
  );
}
