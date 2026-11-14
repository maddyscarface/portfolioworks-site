import "server-only";
import { db } from "./db";
import type { Handler, EventType } from "./outbox";
import { syncContactEvent } from "../crm/ghl";
import type { PipelineKey, StageKey } from "@/config/ghl";
import { flags } from "./flags";
import { PW_RECIPES } from "../datamoon/recipes";
import { vendorContactToGhl } from "../datamoon/ghl";
import type { ImportedContact } from "../datamoon/importer";

/**
 * Outbox delivery handlers. ONLY first-party CRM updates (GHL contact tags / existing opportunity stage). No email, SMS or
 * proposal is ever sent from here, and no price, estimate total or margin is placed on a CRM payload.
 * With no GHL credentials the client runs in LOG mode and the event is marked "skipped (log mode)".
 */
const STAGE: Partial<Record<EventType, { tag: string; stage?: StageKey }>> = {
  "walkthrough.requested": { tag: "pw-walkthrough:requested", stage: "walkthrough_requested" },
  "capture.started": { tag: "pw-walkthrough:started" },
  "capture.submitted": { tag: "pw-walkthrough:submitted", stage: "walkthrough_completed" },
  "capture.corrected": { tag: "pw-walkthrough:corrected" },
  "capture.followup.requested": { tag: "pw-walkthrough:followup-requested" },
  "proposal.marked_sent_externally": { tag: "pw-proposal:sent-by-owner", stage: "proposal_sent" },
};

/** Residential owners use the residential pipeline; landlords / PMs / investors / HOAs use the main projects pipeline. */
const pipelineFor = (customerType: unknown): PipelineKey => (customerType === "homeowner" ? "residential" : "main");

function projectHandler(type: EventType): Handler {
  return async (ev) => {
    const brand = String(ev.brand);
    const projectId = String(ev.payload?.project_id ?? ev.ref_id);
    const project = await db.get("projects", brand, projectId);
    if (!project) return { ok: true, skipped: "project not found for brand" };
    const c = project.customer as { email?: string; first_name?: string; last_name?: string } | undefined;
    if (!c?.email) return { ok: true, skipped: "no customer email" };
    const m = STAGE[type]!;
    const r = await syncContactEvent({
      email: c.email, firstName: c.first_name, lastName: c.last_name, tags: [m.tag, `pw-walkthrough-service:${project.service}`],
      pipeline: m.stage ? pipelineFor(project.customer_type) : undefined, stage: m.stage,
    });
    if (r.mode === "off") return { ok: true, skipped: "GHL_MODE=off" };
    if (r.mode === "log") return { ok: true, skipped: "GHL log mode (no credentials)" };
    return r.ok ? { ok: true, detail: { contactId: r.contactId ?? null, stage_moved: r.opportunity === "updated" } } : { ok: false, error: r.error };
  };
}

const crmSync: Handler = async (ev) => {
  const brand = String(ev.brand);
  if (!flags().datamoonCrmSync) return { ok: true, skipped: "DataMoon CRM sync flag off" };
  const contact = await db.get("vendor_contacts", brand, String(ev.ref_id));
  if (!contact) return { ok: true, skipped: "vendor contact not found" };
  const recipe = PW_RECIPES.find((r) => r.id === contact.recipe_id) ?? (await db.get("audience_recipes", brand, String(contact.recipe_id)))?.recipe as never;
  if (!recipe) return { ok: true, skipped: "recipe not found" };
  const supp = contact.email_hash ? await db.findOne("suppressions", brand, { email_hash: String(contact.email_hash) }) : null;
  const l = vendorContactToGhl(contact as unknown as ImportedContact, recipe, { crmSyncEnabled: true, optedOut: Boolean(supp) });
  if (!l) return { ok: true, skipped: "not eligible (approval, suppression or no email)" };
  const r = await syncContactEvent(l);
  if (r.mode !== "live") return { ok: true, skipped: `GHL ${r.mode} mode` };
  return r.ok ? { ok: true } : { ok: false, error: r.error };
};

export function outboxHandlers(): Partial<Record<EventType, Handler>> {
  const h: Partial<Record<EventType, Handler>> = { "crm.sync": crmSync };
  for (const t of Object.keys(STAGE) as EventType[]) h[t] = projectHandler(t);
  return h;
}
