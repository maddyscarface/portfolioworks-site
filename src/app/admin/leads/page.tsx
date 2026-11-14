import { pageGuard } from "@/lib/p4/admin-page";
import { safeLeads } from "@/lib/p4/admin-data";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { maskEmail } from "@/lib/p4/pii";
import { Badge, Card, Forbidden, PageTitle, Table, when } from "@/components/admin/ui";

export const metadata = { title: "Leads" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { staff, allowed } = await pageGuard("leads.read");
  if (!allowed) return <Forbidden perm="leads.read" />;
  const pii = can(staff, "pii.read", BRAND);
  const vendor = tab === "vendor";
  return (
    <>
      <PageTitle title="Leads" sub="First-party website leads and vendor prospects are kept separate. Vendor prospects are never merged into leads automatically.">
        <div className="flex gap-2">
          <a href="/admin/leads" className={`btn !min-h-9 !px-3 !text-sm ${!vendor ? "btn-char" : "btn-outline"}`}>Website leads</a>
          {can(staff, "datamoon.read", BRAND) && <a href="/admin/leads?tab=vendor" className={`btn !min-h-9 !px-3 !text-sm ${vendor ? "btn-char" : "btn-outline"}`}>Vendor prospects</a>}
          {can(staff, "leads.export_csv", BRAND) && pii && <a href="/admin/api/p4/leads-csv" className="btn btn-outline !min-h-9 !px-3 !text-sm" data-testid="leads-csv">Export CSV</a>}
        </div>
      </PageTitle>
      {vendor ? <VendorTab /> : <SiteTab pii={pii} />}
    </>
  );
}

async function SiteTab({ pii }: { pii: boolean }) {
  const { rows, error } = await safeLeads(500);
  return (
    <Card>
      {error && <p className="err mb-3">{error}</p>}
      <Table head={["Received", "Name", "Email", "Town", "Services", "Form", "Score", "GHL"]} rows={rows.map((r) => [when(r.created_at), `${r.first_name ?? ""} ${r.last_name ?? ""}`, pii ? String(r.email ?? "") : String(maskEmail(String(r.email ?? ""))), String(r.town ?? ""), Array.isArray(r.services) ? r.services.join(", ") : "", String(r.form_type ?? "") + (r.walkthrough_requested ? " · walkthrough" : ""), String(r.lead_score ?? ""), <Badge key="g" tone={r.ghl_sync_status === "failed" ? "bad" : "neutral"}>{String(r.ghl_sync_status ?? "")}</Badge>])} empty="No website leads in this store yet." />
    </Card>
  );
}

async function VendorTab() {
  const rows = await db.list("vendor_contacts", BRAND, {}, { limit: 500 });
  return (
    <Card>
      <p className="mb-3 text-sm text-stone">Imported prospects with field-level provenance. No phone numbers are imported. Suppressed contacts can never sync.</p>
      <Table head={["Contact id", "Name", "City / ZIP", "Topic", "Status", "Source"]} rows={rows.map((v) => [String(v.contact_id), `${v.first_name ?? ""} ${v.last_name ?? ""}`, `${v.city ?? ""} ${v.zip ?? ""}`, String(v.topic ?? ""), <Badge key="s" tone={v.status === "suppressed" ? "bad" : "neutral"}>{String(v.status)}</Badge>, v.synthetic ? <Badge key="x" tone="warn">SYNTHETIC</Badge> : "DataMoon"])} empty="No vendor prospects. DataMoon is not connected; run a synthetic demo from the DataMoon page." />
    </Card>
  );
}
