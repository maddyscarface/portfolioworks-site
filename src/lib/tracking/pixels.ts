"use client";
/**
 * Direct ad/analytics tags (GA4, Google Ads, Meta Pixel), loaded ONLY after the visitor accepts
 * advertising cookies and never when Global Privacy Control is on. Each tag is inactive until its
 * NEXT_PUBLIC_* ID is set. If you manage tags in GTM instead, set NEXT_PUBLIC_TAGS_VIA_GTM=true so
 * these are skipped (the dataLayer events still fire for GTM triggers) — never run both, or
 * conversions double-count.
 *
 * Dedup: every conversion carries the lead's event_id — Meta `eventID` matches the CAPI event_id,
 * Google Ads `transaction_id` = event_id, OpenAI pixel event_id = Conversions API id.
 */
export const TAG_IDS = {
  ga4: process.env.NEXT_PUBLIC_GA4_ID || "",
  googleAds: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "", // AW-XXXXXXXXX
  googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
  metaPixel: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  viaGtm: process.env.NEXT_PUBLIC_TAGS_VIA_GTM === "true",
  // Intent-data pixel (DataMoon / AudienceLab): off unless BOTH are set. See src/lib/intent.
  intentPixel: process.env.NEXT_PUBLIC_INTENT_ENABLED === "true" ? process.env.NEXT_PUBLIC_INTENT_PIXEL_SRC || "" : "",
};

type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq; __pwTagsLoaded?: boolean }
}

function inject(src: string, id: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.id = id;
  document.head.appendChild(s);
}

export const gpcOn = () => typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/** Idempotent. Call after consent is granted. */
export function loadAdTags() {
  if (typeof window === "undefined" || window.__pwTagsLoaded || gpcOn()) return;
  window.__pwTagsLoaded = true;
  if (TAG_IDS.intentPixel && /^https:\/\//.test(TAG_IDS.intentPixel)) inject(TAG_IDS.intentPixel, "pw-intent");
  if (TAG_IDS.viaGtm) return;
  const gtagIds = [TAG_IDS.ga4, TAG_IDS.googleAds].filter(Boolean);
  if (gtagIds.length) {
    inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagIds[0])}`, "pw-gtag");
    window.dataLayer = window.dataLayer || [];
    // gtag.js requires the real `arguments` object (an array is ignored).
    // eslint-disable-next-line prefer-rest-params
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments as unknown as Record<string, unknown>); };
    window.gtag("js", new Date());
    if (TAG_IDS.ga4) window.gtag("config", TAG_IDS.ga4, { send_page_view: true });
    if (TAG_IDS.googleAds) window.gtag("config", TAG_IDS.googleAds, { allow_enhanced_conversions: true });
  }
  if (TAG_IDS.metaPixel && !window.fbq) {
    const f: Fbq = function (...a: unknown[]) { if (f.callMethod) f.callMethod(...a); else f.queue!.push(a); } as Fbq;
    f.queue = []; f.loaded = true; f.version = "2.0"; f.push = f;
    window.fbq = f; window._fbq = f;
    inject("https://connect.facebook.net/en_US/fbevents.js", "pw-fbq");
    window.fbq("init", TAG_IDS.metaPixel);
    window.fbq("track", "PageView");
  }
}

export interface LeadConversion {
  eventId: string;
  funnel: string;
  tier?: string;
  email?: string;
  phone?: string;
  value?: number;
}

/** Browser half of the lead conversion (server halves: Meta CAPI + OpenAI CAPI with the same id). */
export function trackLeadConversion(c: LeadConversion) {
  if (typeof window === "undefined" || !window.__pwTagsLoaded || TAG_IDS.viaGtm) return;
  const value = c.value && c.value > 0 ? { value: c.value, currency: "USD" } : {};
  if (window.gtag && TAG_IDS.ga4) window.gtag("event", "generate_lead", { event_id: c.eventId, funnel: c.funnel, lead_tier: c.tier, ...value });
  if (window.gtag && TAG_IDS.googleAds && TAG_IDS.googleAdsLeadLabel) {
    // Enhanced conversions: gtag hashes these in the browser before sending.
    if (c.email || c.phone) window.gtag("set", "user_data", { ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phone_number: c.phone } : {}) });
    window.gtag("event", "conversion", { send_to: `${TAG_IDS.googleAds}/${TAG_IDS.googleAdsLeadLabel}`, transaction_id: c.eventId, ...value });
  }
  if (window.fbq && TAG_IDS.metaPixel) window.fbq("track", "Lead", { content_category: c.funnel, ...value }, { eventID: c.eventId });
}
