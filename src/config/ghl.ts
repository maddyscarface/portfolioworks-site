/**
 * GoHighLevel mapping for PortfolioWorks (its own sub-account / location — never shared with
 * BuildGhana, DeckCraft or StoneCraft). Every ID comes from an environment variable so nothing
 * account-specific is committed. Create the pipelines, stages, custom fields, tags and workflows in
 * GHL first (docs/08-gohighlevel-crm.md + docs/19-phase2-integrations.md), then paste the IDs into Vercel.
 */
export type PipelineKey = "main" | "partnership";
export type StageKey = "new_lead" | "qualified" | "walkthrough_booked" | "proposal_sent" | "won" | "lost";

export interface PipelineDef {
  label: string;
  pipelineEnv: string;
  /** stage key → env var holding the GHL pipelineStageId */
  stages: Record<StageKey, string>;
}

export const GHL_COMPANY_TAG = "co:portfolioworks";

export const ghlPipelines: Record<PipelineKey, PipelineDef> = {
  main: {
    label: "PortfolioWorks · Turnovers & Projects",
    pipelineEnv: "GHL_PIPELINE_MAIN",
    stages: {
      new_lead: "GHL_STAGE_MAIN_NEW_LEAD",
      qualified: "GHL_STAGE_MAIN_QUALIFIED",
      walkthrough_booked: "GHL_STAGE_MAIN_WALKTHROUGH_BOOKED",
      proposal_sent: "GHL_STAGE_MAIN_PROPOSAL_SENT",
      won: "GHL_STAGE_MAIN_WON",
      lost: "GHL_STAGE_MAIN_LOST",
    },
  },
  partnership: {
    label: "PortfolioWorks · Portfolio Partnerships",
    pipelineEnv: "GHL_PIPELINE_PARTNERSHIP",
    stages: {
      new_lead: "GHL_STAGE_PARTNERSHIP_PROSPECT",
      qualified: "GHL_STAGE_PARTNERSHIP_QUALIFIED",
      walkthrough_booked: "GHL_STAGE_PARTNERSHIP_DISCOVERY_BOOKED",
      proposal_sent: "GHL_STAGE_PARTNERSHIP_PILOT_PROPOSED",
      won: "GHL_STAGE_PARTNERSHIP_APPROVED_VENDOR",
      lost: "GHL_STAGE_PARTNERSHIP_LOST",
    },
  },
};

/** Website/CRM stage names (used by /api/crm-webhook) → pipeline stage key. */
export const CRM_STAGE_TO_KEY: Record<string, StageKey> = {
  qualified_lead: "qualified",
  site_walk_booked: "walkthrough_booked",
  proposal_sent: "proposal_sent",
  contract_signed: "won",
  purchase: "won",
  lost: "lost",
};

export interface FollowUpContext {
  tier: "hot" | "warm" | "nurture";
  pipeline: PipelineKey;
  funnel: string;
  inMarket: boolean;
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
  { id: "speed_to_lead", description: "Hot lead: instant email + coordinator task, call within 5 business minutes", tag: "pw-fu:speed-to-lead", workflowEnv: "GHL_WORKFLOW_SPEED_TO_LEAD", when: (c) => c.tier === "hot" && c.inMarket },
  { id: "warm_nurture", description: "Warm lead: confirmation, photo request, walkthrough booking reminders (days 0/1/3/7)", tag: "pw-fu:warm-nurture", workflowEnv: "GHL_WORKFLOW_WARM_NURTURE", when: (c) => c.tier === "warm" && c.inMarket },
  { id: "long_nurture", description: "Nurture lead: monthly owner tips + estimator nudges", tag: "pw-fu:long-nurture", workflowEnv: "GHL_WORKFLOW_LONG_NURTURE", when: (c) => c.tier === "nurture" && c.inMarket },
  { id: "partnership_sequence", description: "Portfolio partnership: discovery-call booking + vendor prequal packet (COI, W-9)", tag: "pw-fu:partnership", workflowEnv: "GHL_WORKFLOW_PARTNERSHIP", when: (c) => c.pipeline === "partnership" },
  { id: "urgent_turnover", description: "Time-sensitive turnover: coordinator alert + same-day reply", tag: "pw-fu:urgent", workflowEnv: "GHL_WORKFLOW_URGENT", when: (c) => c.funnel === "urgent" },
  { id: "out_of_area", description: "Outside launch markets: honest availability reply, waitlist tag", tag: "pw-fu:out-of-area", workflowEnv: "GHL_WORKFLOW_OUT_OF_AREA", when: (c) => !c.inMarket },
];

export const TIER_TAGS = ["pw-tier:hot", "pw-tier:warm", "pw-tier:nurture"] as const;
