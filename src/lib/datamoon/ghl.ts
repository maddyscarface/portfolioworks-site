import type { GhlEventSync } from "../crm/ghl";
import type { ImportedContact } from "./importer";
import type { Recipe } from "./recipes";

/**
 * Maps an imported DataMoon prospect to a GoHighLevel contact upsert for the PortfolioWorks sub-account.
 * Returns null (no sync) when: CRM sync flag off, recipe lacks CRM approval or a CRM destination, contact suppressed /
 * opted out, or no email. Prospects get NO opportunity/stage, are tagged no-SMS, and carry no phone.
 */
export function vendorContactToGhl(c: ImportedContact, r: Recipe, opts: { crmSyncEnabled: boolean; optedOut: boolean }): GhlEventSync | null {
  if (!opts.crmSyncEnabled) return null;
  if (!r.approvals.crm_sync || !r.approved_destinations.includes("ghl_email_nurture")) return null;
  if (opts.optedOut || c.status === "suppressed" || !c.email) return null;
  return {
    email: c.email, firstName: c.first_name ?? undefined, lastName: c.last_name ?? undefined, companyName: c.company_name ?? undefined, source: "datamoon",
    tags: ["source:datamoon", `datamoon-recipe:${r.id}`, "intent:no-sms", "consent:none-recorded", "prospect:not-a-lead"],
  };
}
