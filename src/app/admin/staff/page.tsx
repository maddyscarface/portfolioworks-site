import { pageGuard } from "@/lib/p4/admin-page";
import { listConfiguredStaff } from "@/lib/p4/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@/lib/p4/rbac";
import { Card, Forbidden, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Staff & roles" };

export default async function Page() {
  const { allowed } = await pageGuard("staff.read");
  if (!allowed) return <Forbidden perm="staff.read" />;
  const staff = listConfiguredStaff();
  return (
    <>
      <PageTitle title="Staff & roles" sub="Accounts come from the server-only ADMIN_USERS_JSON (PBKDF2 password hashes; create with scripts/hash-admin-password.mjs). ADMIN_PASSWORD remains a single owner fallback. Access is deny-by-default per permission and per brand." />
      <Card title="Configured accounts" className="mb-5"><Table head={["User", "Role", "Brands"]} rows={staff.map((s) => [s.user, s.role, s.brands.join(", ")])} empty="No staff configured (admin returns 503)." /></Card>
      <Card title="Permission matrix">
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead><tr className="border-b border-line"><th className="py-2 text-left">Permission</th>{ROLES.map((r) => <th key={r} className="px-2 py-2">{r.replace("_", " ")}</th>)}</tr></thead>
          <tbody>{PERMISSIONS.map((p) => <tr key={p} className="border-b border-bone-2"><td className="py-1.5 font-mono">{p}</td>{ROLES.map((r) => <td key={r} className="px-2 text-center">{ROLE_PERMISSIONS[r].has(p) ? "●" : ""}</td>)}</tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
