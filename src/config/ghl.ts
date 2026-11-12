/**
 * GoHighLevel mapping for PortfolioWorks (its own sub-account / location — never shared with
 * BuildGhana, DeckCraft or StoneCraft). Every ID comes from an environment variable so nothing
 * account-specific is committed. Create the pipelines, stages, custom fields, tags and workflows in
 * GHL first (docs/08-gohighlevel-crm.md + docs/19-phase2-integrations.md), then paste the IDs into Vercel.
 */
export type PipelineKey = "main" | "residential" | "partnership";

/**
 * Project-job stages EXACTLY as spec'd in the Phase 2 build brief (specs/03 §3):
 * New inquiry → Qualified → Walkthrough requested → Walkthrough completed → Scope developing →
 * Proposal sent → Awarded → In progress → Closeout → Repeat opportunity.
 * Lost / not-a-fit is the GHL opportunity *status* ("lost"), not a stage.
 */
export const PROJECT_STAGES = [
  ["new_inquiry", "New inquiry"], ["qualified", "Qualified"], ["walkthrough_requested", "Walkthrough requested"],
  ["walkthrough_completed", "Walkthrough completed"], ["scope_developing", "Scope developing"], ["proposal_sent", "Proposal sent"],
  ["awarded", "Awarded"], ["in_progress", "In progress"], ["closeout", "Closeout"], ["repeat_opportunity", "Repeat opportunity"],
] as const;
/**
 * Separate portfolio / recurring-contract pipeline (specs/03 §3; stage names from docs/08, consultation before any
 * formal proposal per specs/03 §2). Not-a-fit = opportunity status "lost".
 */
export const PARTNERSHIP_STAGES = [
  ["prospect", "Prospect"], ["contact_verified", "Contact verified"], ["consultation", "Consultation"],
  ["vendor_prequal", "Vendor prequalification"], ["pilot_property", "Pilot property"], ["approved_vendor", "Approved vendor"],
  ["recurring_work", "Recurring work"], ["expansion", "Expansion"],
] as const;
export type ProjectStageKey = (typeof PROJECT_STAGES)[number][0];
export type PartnershipStageKey = (typeof PARTNERSHIP_STAGES)[number][0];
export type StageKey = ProjectStageKey | PartnershipStageKey;

export interface PipelineDef {
  label: string;
  pipelineEnv: string;
  /** first stage for new website leads */
  entry: StageKey;
  /** stage key → env var holding the GHL pipelineStageId */
  stages: Partial<Record<StageKey, string>>;
  stageNames: Partial<Record<StageKey, string>>;
}

export const GHL_COMPANY_TAG = "co:portfolioworks";

function build(prefix: string, list: readonly (readonly [string, string])[]) {
  return {
    stages: Object.fromEntries(list.map(([k]) => [k, `GHL_STAGE_${prefix}_${k.toUpperCase()}`])) as PipelineDef["stages"],
    stageNames: Object.fromEntries(list) as PipelineDef["stageNames"],
  };
}

/**
 * Three pipelines so property-manager / landlord opportunities are never mixed with consumer homeowner leads
 * (specs/03 §3): business project jobs, residential-owner project jobs (same stages), portfolio programs.
 */
export const ghlPipelines: Record<PipelineKey, PipelineDef> = {
  main: { label: "PortfolioWorks · Projects (landlords, PMs, investors, HOAs)", pipelineEnv: "GHL_PIPELINE_MAIN", entry: "new_inquiry", ...build("MAIN", PROJECT_STAGES) },
  residential: { label: "PortfolioWorks · Residential owner projects", pipelineEnv: "GHL_PIPELINE_RESIDENTIAL", entry: "new_inquiry", ...build("RESIDENTIAL", PROJECT_STAGES) },
  partnership: { label: "PortfolioWorks · Portfolio & recurring contracts", pipelineEnv: "GHL_PIPELINE_PARTNERSHIP", entry: "prospect", ...build("PARTNERSHIP", PARTNERSHIP_STAGES) },
};
export const entryStageEnv = (p: PipelineKey) => ghlPipelines[p].stages[ghlPipelines[p].entry]!;

/** Webhook event aliases (specs/03 §4 names → canonical names used by the ad-platform mappings). */
export const CRM_EVENT_ALIASES: Record<string, string> = {
  walkthrough_scheduled: "site_walk_booked",
  estimate_sent: "proposal_sent",
  proposal_won: "contract_signed",
  realized_revenue: "purchase",
};

/** Canonical CRM event (body.stage on /api/crm-webhook) → pipeline stage key. */
const PROJECT_EVENT_STAGE: Record<string, StageKey> = {
  qualified_lead: "qualified", site_walk_booked: "walkthrough_requested", walkthrough_completed: "walkthrough_completed",
  proposal_sent: "proposal_sent", contract_signed: "awarded", purchase: "closeout",
};
export const CRM_STAGE_TO_KEY: Record<PipelineKey, Record<string, StageKey>> = {
  main: PROJECT_EVENT_STAGE,
  residential: PROJECT_EVENT_STAGE,
  partnership: { qualified_lead: "contact_verified", site_walk_booked: "consultation", walkthrough_completed: "consultation", proposal_sent: "pilot_property", contract_signed: "approved_vendor", purchase: "recurring_work" },
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
