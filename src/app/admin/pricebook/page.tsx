import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { Card, Forbidden, PageTitle } from "@/components/admin/ui";
import { PricebookEditor } from "@/components/admin/PricebookEditor";

export const metadata = { title: "Price book" };

export default async function Page() {
  const { staff, allowed } = await pageGuard("pricebook.read");
  if (!allowed) return <Forbidden perm="pricebook.read" />;
  const items = await db.list("pricebook_items", BRAND, {}, { asc: true });
  return (
    <>
      <PageTitle title="Price book" sub="Owner-only rates used by the private estimator. Ships blank: no rates are invented. Rates apply to an estimate only when approved here and chosen by the estimator." />
      <Card><PricebookEditor initial={JSON.parse(JSON.stringify(items))} canWrite={can(staff, "pricebook.write", BRAND)} /></Card>
    </>
  );
}
