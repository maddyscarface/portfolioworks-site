import "server-only";
import { headers } from "next/headers";
import { staffFromAuthorization } from "./auth";
import { can, type Permission, type Staff } from "./rbac";
import { BRAND } from "./flags";

/** Server components: who is signed in (middleware already required valid credentials). */
export async function pageStaff(): Promise<Staff | null> {
  return staffFromAuthorization((await headers()).get("authorization"));
}
export async function pageGuard(perm: Permission): Promise<{ staff: Staff | null; allowed: boolean }> {
  const staff = await pageStaff();
  return { staff, allowed: can(staff, perm, BRAND) };
}
