/**
 * Role-based access for the PortfolioWorks admin. Deny by default: a permission not listed for a role is refused.
 * Least privilege defaults; the owner can widen them later (owner decision: who may quote, export and see margins).
 */
export const ROLES = ["owner", "manager", "marketer", "estimator", "operator", "legal_reviewer", "read_only"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "leads.read", "leads.write", "pii.read", "leads.export_csv",
  "projects.read", "projects.write", "media.read", "media.delete", "media.privacy_review", "walkthrough.invite",
  "estimate.read", "estimate.write", "estimate.margin.read",
  "pricebook.read", "pricebook.write",
  "proposal.approve", "proposal.export", "proposal.mark_sent",
  "crm.read", "crm.replay",
  "datamoon.read", "datamoon.recipe.write", "datamoon.recipe.approve_legal", "datamoon.recipe.approve_export", "datamoon.recipe.approve_crm", "datamoon.import",
  "suppressions.read", "suppressions.write",
  "staff.read", "audit.read", "reports.read", "reports.financial", "integrations.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: ALL,
  manager: new Set<Permission>([
    "leads.read", "leads.write", "pii.read", "leads.export_csv", "projects.read", "projects.write", "media.read", "media.privacy_review", "walkthrough.invite",
    "estimate.read", "crm.read", "crm.replay", "datamoon.read", "suppressions.read", "suppressions.write", "staff.read", "audit.read", "reports.read", "integrations.read",
  ]),
  marketer: new Set<Permission>(["leads.read", "datamoon.read", "datamoon.recipe.write", "suppressions.read", "suppressions.write", "reports.read", "crm.read", "integrations.read"]),
  estimator: new Set<Permission>(["leads.read", "pii.read", "projects.read", "projects.write", "media.read", "walkthrough.invite", "estimate.read", "estimate.write", "pricebook.read"]),
  operator: new Set<Permission>(["projects.read", "media.read", "walkthrough.invite", "crm.read", "integrations.read"]),
  legal_reviewer: new Set<Permission>(["media.privacy_review", "datamoon.read", "datamoon.recipe.approve_legal", "suppressions.read", "suppressions.write", "audit.read", "integrations.read"]),
  read_only: new Set<Permission>(["leads.read", "projects.read", "reports.read"]),
};

export type Staff = { user: string; role: Role; brands: string[] };

export const isRole = (r: unknown): r is Role => typeof r === "string" && (ROLES as readonly string[]).includes(r);

/** Single decision point. Unknown role, missing brand membership or unlisted permission → false. */
export function can(staff: Staff | null | undefined, perm: Permission, brand: string): boolean {
  if (!staff || !isRole(staff.role)) return false;
  if (!staff.brands.includes(brand)) return false;
  return ROLE_PERMISSIONS[staff.role].has(perm);
}

export class AccessDenied extends Error {
  status = 403;
  constructor(public perm: string) { super(`Forbidden: ${perm}`); }
}
