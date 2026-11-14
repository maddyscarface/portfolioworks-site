import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { Card, Forbidden, PageTitle, Table, when } from "@/components/admin/ui";
import { SuppressionForm } from "@/components/admin/SuppressionForm";

export const metadata = { title: "Suppressions" };

export default async function Page() {
  const { staff, allowed } = await pageGuard("suppressions.read");
  if (!allowed) return <Forbidden perm="suppressions.read" />;
  const rows = await db.list("suppressions", BRAND, {}, { limit: 1000 });
  return (
    <>
      <PageTitle title="Suppressions & opt-outs" sub="Stored as SHA-256 email hashes only. A suppressed person is excluded from every vendor import, CRM sync and audience, and matching prospects are marked suppressed immediately." />
      {can(staff, "suppressions.write", BRAND) && <Card title="Add a suppression" className="mb-5"><SuppressionForm /></Card>}
      <Card><Table head={["Email hash", "Reason", "Source", "Added"]} rows={rows.map((s) => [<code key="c" className="text-xs">{String(s.email_hash).slice(0, 16)}…</code>, String(s.reason), String(s.source), when(s.created_at)])} empty="No suppressions." /></Card>
    </>
  );
}
