import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { staffEstimateView } from "@/lib/estimator/service";
import { A, Forbidden, PageTitle } from "@/components/admin/ui";
import { EstimateEditor, type EstimateDTO } from "@/components/admin/EstimateEditor";

export const metadata = { title: "Estimate" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { staff, allowed } = await pageGuard("estimate.read");
  if (!allowed || !staff) return <Forbidden perm="estimate.read" />;
  const e = await db.get("estimates", BRAND, id);
  if (!e) notFound();
  const pb = can(staff, "pricebook.read", BRAND) ? (await db.list("pricebook_items", BRAND, {}, { asc: true })).filter((p) => p.approved && p.rate !== null) : [];
  const dto = JSON.parse(JSON.stringify(staffEstimateView(e, staff, BRAND))) as EstimateDTO;
  return (
    <>
      <PageTitle title={`Estimate R${String(e.revision)}`} sub={`Project ${String(e.project_id)} · capture revision ${String(e.capture_revision_no)}`}><A href={`/admin/projects/${e.project_id}`}>Back to project</A></PageTitle>
      <EstimateEditor initial={dto} pricebook={JSON.parse(JSON.stringify(pb))} perms={{ write: can(staff, "estimate.write", BRAND), approve: can(staff, "proposal.approve", BRAND), export: can(staff, "proposal.export", BRAND), markSent: can(staff, "proposal.mark_sent", BRAND) }} />
    </>
  );
}
