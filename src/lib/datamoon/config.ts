import "server-only";
import { flags } from "../p4/flags";

/** Server-only DataMoon credentials. Main module, legacy and intent keys are separate and never shared. */
export function dmKeys(e = process.env) {
  return {
    mainModule: e.DATAMOON_MAIN_MODULE_KEY || null,
    legacy: e.DATAMOON_LEGACY_KEY || null,
    intent: e.DATAMOON_INTENT_KEY || null,
    webhookSecret: e.DATAMOON_INTENT_WEBHOOK_SECRET || null,
  };
}

export function dmLimits(e = process.env) {
  const n = (v: string | undefined) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0; };
  return {
    maxRecordsPerRun: n(e.DATAMOON_MAX_RECORDS_PER_RUN),        // 0 = no activation allowed
    monthlyRecordCeiling: n(e.DATAMOON_MONTHLY_RECORD_CEILING),  // owner budget ceiling across runs
    budgetApproved: e.DATAMOON_BUDGET_APPROVED === "true",
  };
}

/** Feed id → brand map for webhook routing; unknown feeds are rejected (cross-brand injection guard). */
export function feedBrandMap(e = process.env): Record<string, string> {
  try { const m = JSON.parse(e.DATAMOON_FEED_BRAND_MAP || "{}"); return m && typeof m === "object" ? m : {}; } catch { return {}; }
}

export type FamilyStatus = "disabled" | "not_connected" | "configured_unverified";
/** Never reports "live": a configured key is only "configured (unverified)" until real test evidence is recorded. */
export function dmStatus(e = process.env) {
  const f = flags(e); const k = dmKeys(e);
  const st = (flag: boolean, key: string | null): FamilyStatus => (!flag ? "disabled" : key ? "configured_unverified" : "not_connected");
  return {
    master: f.datamoon,
    main: st(f.datamoonMain, k.mainModule),
    legacy: st(f.datamoonMain, k.legacy),
    intent: st(f.datamoonIntent, k.intent),
    webhook: st(f.datamoonIntent, k.webhookSecret),
    topicSearch: f.datamoonTopicSearch ? ("configured_unverified" as FamilyStatus) : ("disabled" as FamilyStatus),
    activation: f.datamoonActivation,
    crmSync: f.datamoonCrmSync,
    limits: dmLimits(e),
  };
}
