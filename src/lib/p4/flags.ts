/**
 * Phase 4 feature flags. Every external vendor and native AR/measurement provider defaults OFF.
 * Only the literal string "true" turns a flag on. Read on the server; never expose secrets via NEXT_PUBLIC.
 */
export type Env = Record<string, string | undefined>;
const on = (e: Env, k: string) => e[k] === "true";
/** Brand-owned first-party features default ON unless explicitly set to "false". */
const notOff = (e: Env, k: string) => e[k] !== "false";

export const BRAND = "portfolioworks" as const;
export type Brand = string;

export function flags(e: Env = process.env) {
  return {
    // DataMoon: master switch AND per-family switches AND per-brand activation must all be true.
    datamoon: on(e, "DATAMOON_ENABLED"),
    datamoonMain: on(e, "DATAMOON_ENABLED") && on(e, "DATAMOON_MAIN_API_ENABLED"),
    datamoonIntent: on(e, "DATAMOON_ENABLED") && on(e, "DATAMOON_INTENT_ENABLED"),
    datamoonTopicSearch: on(e, "DATAMOON_ENABLED") && on(e, "DATAMOON_TOPIC_SEARCH_ENABLED"),
    datamoonActivation: on(e, "DATAMOON_ENABLED") && on(e, "DATAMOON_AUDIENCE_ACTIVATION_PORTFOLIOWORKS"),
    datamoonCrmSync: on(e, "DATAMOON_ENABLED") && on(e, "DATAMOON_CRM_SYNC_PORTFOLIOWORKS"),
    // Native / vendor measurement providers: contracts only, disabled pending real-device validation and licences.
    arArkit: on(e, "AR_ARKIT_ENABLED"),
    arRoomplan: on(e, "AR_ROOMPLAN_ENABLED"),
    arArcore: on(e, "AR_ARCORE_ENABLED"),
    hover: on(e, "MEASURE_HOVER_ENABLED"),
    cubicasa: on(e, "MEASURE_CUBICASA_ENABLED"),
    // Mobile walkthrough (spec §3): OFF until privacy / tenancy QA is signed off. Only "true" turns it on.
    walkthrough: on(e, "PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED"),
    // First-party internal tool (no vendor, staff only): on by default, can be switched off.
    estimator: notOff(e, "ESTIMATOR_ENABLED"),
    // Internal planning ranges are NOT sent to GHL unless explicitly enabled (GHL workflows could merge them into SMS).
    ghlInternalPricingFields: on(e, "GHL_SEND_INTERNAL_PRICING"),
  };
}
export type Flags = ReturnType<typeof flags>;
