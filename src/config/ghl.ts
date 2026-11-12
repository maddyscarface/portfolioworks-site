/**
 * GoHighLevel mapping for PortfolioWorks (its own sub-account / location — never shared with
 * BuildGhana, DeckCraft or StoneCraft). Every ID comes from an environment variable so nothing
 * account-specific is committed. Create the pipelines, stages, custom fields, tags and workflows in
 * GHL first (docs/08-gohighlevel-crm.md + docs/19-phase2-integrations.md), then paste the IDs into Vercel.
 */
export type PipelineKey = "main" | "partnership";

/** Stage keys exactly as spec'd in docs/08-gohighlevel-crm.md (§Pipelines). */
export const MAIN_STAGES = [
  ["new_lead", "New Lead"], ["qualified", "Qualified"], ["scope_intake", "Scope Intake"], ["site_walk", "Site Walk"],
  ["estimate", "Estimate"], ["proposal", "Proposal"], ["negotiation", "Negotiation"], ["won", "Won"],
  ["scheduled", "Scheduled"], ["in_progress", "In Progress"], ["punch_list", "Punch List"], ["complete", "Complete"],
  ["paid", "Paid"], ["repeat_nurture", "Repeat/Nurture"], ["lost", "Lost"], ["waitlist", "Waitlist – Non-launch Market"],
] as const;
export const PARTNERSHIP_STAGES = [
  ["new_lead", "Prospect"], ["contact_verified", "Contact Verified"], ["outreach", "Outreach"], ["discovery", "Discovery"],
  ["vendor_prequal", "Vendor Prequalification"], ["pilot_property", "Pilot Property"], ["approved_vendor", "Approved Vendor"],
  ["recurring_work", "Recurring Work"], ["expansion", "Expansion"], ["lost", "Not a Fit"],
] as const;
export type MainStageKey = (typeof MAIN_STAGES)[number][0];
export type PartnershipStageKey = (typeof PARTNERSHIP_STAGES)[number][0];
export type StageKey = MainStageKey | PartnershipStageKey;

export interface PipelineDef {
  label: string;
  pipelineEnv: string;
  /** stage key → env var holding the GHL pipelineStageId (every pipeline has new_lead + lost) */
  stages: Partial<Record<StageKey, string>> & { new_lead: string; lost: string };
  /** stage key → display name used in GHL */
  stageNames: Partial<Record<StageKey, string>>;
}

export const GHL_COMPANY_TAG = "co:portfolioworks";

const envName = (prefix: string, key: string, label: string) =>
  key === "new_lead" && prefix === "PARTNERSHIP" ? "GHL_STAGE_PARTNERSHIP_PROSPECT"
  : key === "lost" && prefix === "PARTNERSHIP" ? "GHL_STAGE_PARTNERSHIP_NOT_A_FIT"
  : `GHL_STAGE_${prefix}_${key.toUpperCase()}`;
function build(prefix: string, list: readonly (readonly [string, string])[]) {
  return {
    stages: Object.fromEntries(list.map(([k, l]) => [k, envName(prefix, k, l)])) as PipelineDef["stages"],
    stageNames: Object.fromEntries(list) as PipelineDef["stageNames"],
  };
}

export const ghlPipelines: Record<PipelineKey, PipelineDef> = {
  main: { label: "PortfolioWorks · Turnovers & Projects", pipelineEnv: "GHL_PIPELINE_MAIN", ...build("MAIN", MAIN_STAGES) },
  partnership: { label: "PortfolioWorks · Portfolio Partnership", pipelineEnv: "GHL_PIPELINE_PARTNERSHIP", ...build("PARTNERSHIP", PARTNERSHIP_STAGES) },
};

/**
 * Website/CRM stage events (body.stage on /api/crm-webhook, spec'd in docs/08 + docs/11) → pipeline stage key.
 * Main pipeline: Qualified, Site Walk, Proposal, Won, Paid. Partnership equivalents for account-level events.
 */
export const CRM_STAGE_TO_KEY: Record<PipelineKey, Record<string, StageKey>> = {
  main: { qualified_lead: "qualified", site_walk_booked: "site_walk", proposal_sent: "proposal", contract_signed: "won", purchase: "paid", lost: "lost" },
  partnership: { qualified_lead: "contact_verified", site_walk_booked: "discovery", proposal_sent: "pilot_property", contract_signed: "approved_vendor", purchase: "recurring_work", lost: "lost" },
};

export interface FollowUpContext {
  tier: "hot" | "warm" | "nurture";
  pipeline: PipelineKey;
  funnel: string;
  /** true only for a market with status "launch" */
  inMarket: boolean;
  /** ZIP matched a configured market that is not launched yet (FL/ME today) → Waitlist */
  waitlist: boolean;
  hasPhotos: boolean;
  smsConsent: boolean;
}

export interface FollowUpDef {
  id: string;
  description: string;
  /** Tag added to the contact. Build GHL workflows with the trigger "Contact tag added = <tag>". */
  tag: string;
  /** Optional: env var with a workflow ID for direct API enrollment (instead of / as well as the tag trigger). */
  workflowEnv: string;
  when: (c: FollowUpContext) => boolean;
}

/**
 * Automated follow-up hooks. The site only tags/enrolls; message content, timing and SMS/email
 * channels live in GHL. SMS steps must check the `sms-consent` tag (TCPA / A2P 10DLC).
 */
export const followUps: FollowUpDef[] = [
  // docs/08 workflow 1 (Instant lead response). Every launch-market lead; GHL sends L1 email, S1 SMS only with sms-consent, notifies the coordinator and creates the task "Call within 1 business hour".
  { id: "instant_response", description: "WF1 Instant lead response: L1 email, S1 SMS (consented only), coordinator notification, call task (1 business hour)", tag: "pw-fu:instant-response", workflowEnv: "GHL_WORKFLOW_INSTANT_RESPONSE", when: (c) => c.inMarket },
  { id: "speed_to_lead", description: "WF1 hot branch: coordinator alert by SMS + email", tag: "pw-fu:speed-to-lead", workflowEnv: "GHL_WORKFLOW_SPEED_TO_LEAD", when: (c) => c.tier === "hot" && c.inMarket },
  // docs/08 workflow 2 (Photo request)
  { id: "photo_request", description: "WF2 Photo request: +10 min secure upload link, +1 day reminder, +3 days call task", tag: "pw-fu:photo-request", workflowEnv: "GHL_WORKFLOW_PHOTO_REQUEST", when: (c) => c.inMarket && !c.hasPhotos && ["turnover", "trade", "urgent"].includes(c.funnel) },
  { id: "warm_nurture", description: "Warm lead: walkthrough booking reminders (days 1/3/7)", tag: "pw-fu:warm-nurture", workflowEnv: "GHL_WORKFLOW_WARM_NURTURE", when: (c) => c.tier === "warm" && c.inMarket },
  { id: "long_nurture", description: "Nurture lead: planner/checklist value emails (docs/08 workflow 12 pattern)", tag: "pw-fu:long-nurture", workflowEnv: "GHL_WORKFLOW_LONG_NURTURE", when: (c) => c.tier === "nurture" && c.inMarket },
  { id: "partnership_sequence", description: "Portfolio partnership: discovery-call booking + vendor prequalification packet (COI, W-9)", tag: "pw-fu:partnership", workflowEnv: "GHL_WORKFLOW_PARTNERSHIP", when: (c) => c.pipeline === "partnership" && !c.waitlist },
  { id: "urgent_turnover", description: "Time-sensitive turnover: priority coordinator alert", tag: "pw-fu:urgent", workflowEnv: "GHL_WORKFLOW_URGENT", when: (c) => c.funnel === "urgent" && c.inMarket },
  // docs/08 workflow 14 (Non-launch market waitlist) and 15 (Out-of-area)
  { id: "waitlist", description: "WF14 Non-launch market: honest 'opening soon' auto-reply, stage Waitlist, no sales tasks", tag: "pw-fu:waitlist", workflowEnv: "GHL_WORKFLOW_WAITLIST", when: (c) => c.waitlist },
  { id: "out_of_area", description: "WF15 Out-of-area: polite decline/referral email, no further automation", tag: "pw-fu:out-of-area", workflowEnv: "GHL_WORKFLOW_OUT_OF_AREA", when: (c) => !c.inMarket && !c.waitlist },
];

/** Stage-driven workflows (docs/08 #3–#13) are triggered inside GHL by stage changes; the site needs no hook for them. */
export const TIER_TAGS = ["pw-tier:hot", "pw-tier:warm", "pw-tier:nurture"] as const;
