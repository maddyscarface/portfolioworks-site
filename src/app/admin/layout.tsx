import Link from "next/link";
import { pageStaff } from "@/lib/p4/admin-page";
import { can, type Permission } from "@/lib/p4/rbac";
import { BRAND } from "@/lib/p4/flags";
import { storageMode } from "@/lib/p4/db";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s | PortfolioWorks Admin" }, robots: { index: false, follow: false } };

const NAV: [string, string, Permission][] = [
  ["/admin", "Dashboard", "leads.read"], ["/admin/search", "Search", "leads.read"], ["/admin/leads", "Leads", "leads.read"], ["/admin/projects", "Projects & walkthroughs", "projects.read"],
  ["/admin/pricebook", "Price book", "pricebook.read"], ["/admin/crm", "CRM sync", "crm.read"], ["/admin/datamoon", "DataMoon (off)", "datamoon.read"], ["/admin/suppressions", "Suppressions", "suppressions.read"],
  ["/admin/reports", "Reports", "reports.read"], ["/admin/audit", "Audit log", "audit.read"], ["/admin/integrations", "Integrations", "integrations.read"], ["/admin/staff", "Staff & roles", "staff.read"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await pageStaff();
  const mode = storageMode();
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-char-3 bg-char text-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/admin" className="font-display text-lg">PortfolioWorks Admin</Link>
          <p className="text-xs text-white/70">{staff ? <>Signed in as <b className="text-white">{staff.user}</b> · {staff.role.replace("_", " ")}</> : "Not signed in"}{mode !== "supabase" && <span className="ml-3 rounded bg-[#7a4b06] px-2 py-0.5 text-white">Storage: {mode} (not durable)</span>}</p>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 pb-2 text-sm" aria-label="Admin">
          {NAV.filter(([, , p]) => can(staff, p, BRAND)).map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-[2px] px-3 py-1.5 text-white/85 hover:bg-white/10">{label}</Link>)}
        </nav>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 py-8">{children}</div>
    </div>
  );
}
