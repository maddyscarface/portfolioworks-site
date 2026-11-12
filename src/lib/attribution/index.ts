/**
 * Attribution helpers shared by the lead API, GoHighLevel sync and revenue reporting.
 * First touch = the visit that first brought the person in (never overwritten in the browser).
 * Last touch  = the most recent visit carrying campaign parameters or a click ID.
 */
export type Attribution = Partial<Record<string, string | number | undefined>>;

export type Channel =
  | "paid_search_google"
  | "paid_search_microsoft"
  | "paid_social_meta"
  | "paid_social_other"
  | "chatgpt_ads"
  | "email"
  | "organic_search"
  | "referral"
  | "direct";

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex)\./i;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v)).toLowerCase();

/** Classify a touch. `prefix` = "" for first touch or "last_" for last touch. */
export function channelOf(a: Attribution = {}, prefix: "" | "last_" = ""): Channel {
  const src = str(a[`${prefix}utm_source`]);
  const med = str(a[`${prefix}utm_medium`]);
  const ref = str(a[prefix ? "last_referrer" : "referrer"]);
  const paid = /cpc|ppc|paid|display|cpm|ads?$/.test(med);
  if (a.openai_oppref || /chatgpt|openai/.test(src)) return "chatgpt_ads";
  if ((!prefix && (a.gclid || a.gbraid || a.wbraid)) || (paid && /google|adwords/.test(src))) return "paid_search_google";
  if ((!prefix && a.msclkid) || (paid && /bing|microsoft/.test(src))) return "paid_search_microsoft";
  if ((!prefix && (a.fbclid || a.fbc)) || (paid && /facebook|instagram|meta|fb|ig/.test(src))) return "paid_social_meta";
  if ((!prefix && (a.ttclid || a.li_fat_id)) || (paid && /tiktok|linkedin|x|twitter/.test(src))) return "paid_social_other";
  if (med === "email" || /newsletter|ghl|email/.test(src)) return "email";
  if (med === "organic" || SEARCH_ENGINES.test(ref)) return "organic_search";
  if (ref && !/portfolioworks/.test(ref)) return "referral";
  return "direct";
}

export interface TouchSummary {
  firstChannel: Channel;
  lastChannel: Channel;
  firstSource: string;
  lastSource: string;
  firstCampaign: string;
  lastCampaign: string;
  clickIds: { gclid?: string; gbraid?: string; wbraid?: string; fbclid?: string; msclkid?: string; ttclid?: string; li_fat_id?: string };
}

export function summarizeTouches(a: Attribution = {}): TouchSummary {
  const sm = (s?: unknown, m?: unknown) => [s, m].filter(Boolean).join(" / ") || "";
  const hasLast = Boolean(a.last_utm_source || a.last_touch_at);
  const pick = (k: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : undefined);
  return {
    firstChannel: channelOf(a, ""),
    lastChannel: hasLast ? channelOf(a, "last_") : channelOf(a, ""),
    firstSource: sm(a.utm_source, a.utm_medium) || (a.referrer ? String(a.referrer) : "direct"),
    lastSource: hasLast ? sm(a.last_utm_source, a.last_utm_medium) || "direct" : sm(a.utm_source, a.utm_medium) || "direct",
    firstCampaign: String(a.utm_campaign ?? ""),
    lastCampaign: String((hasLast ? a.last_utm_campaign : a.utm_campaign) ?? ""),
    clickIds: { gclid: pick("gclid"), gbraid: pick("gbraid"), wbraid: pick("wbraid"), fbclid: pick("fbclid"), msclkid: pick("msclkid"), ttclid: pick("ttclid"), li_fat_id: pick("li_fat_id") },
  };
}
