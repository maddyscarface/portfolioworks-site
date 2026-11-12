"use client";
/**
 * GTM + Consent Mode v2 + first-party attribution capture.
 * - Consent defaults to denied for ad_storage/ad_user_data/ad_personalization until the visitor accepts.
 * - Attribution (UTMs + click IDs + landing page) is stored first-touch in localStorage and
 *   attached to every lead submission.
 */
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OPENAI_PIXEL_ID, oaiqConsent, oaiqSnippet, openAiRefs } from "@/lib/openai-ads/client";
import { forwardFunnelEventToGa4, loadAdTags } from "@/lib/tracking/pixels";

const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const ATTR_KEY = "pw_attr";
const CONSENT_KEY = "pw_consent";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag?: (...a: unknown[]) => void;
  }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  forwardFunnelEventToGa4(event, params); // no-op unless direct GA4 is loaded (consented, not via GTM)
}

/** `view_service` (docs/11): service detail pages and the turnover service page. */
export function serviceFromPath(path: string) {
  const m = path.match(/^\/services\/([a-z0-9-]+)\/?$/);
  return m ? m[1] : path === "/rental-turnovers" ? "rental-turnovers" : null;
}

/** True only after the visitor accepted (opt-in site) and has no Global Privacy Control signal. */
export function adsConsentGranted() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true;
  } catch {
    return false;
  }
}

function readCookie(name: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}

export function getAttribution(): Record<string, string> {
  try {
    const a = JSON.parse(localStorage.getItem(ATTR_KEY) || "{}");
    const fbp = readCookie("_fbp");
    const fbc = readCookie("_fbc") ?? a.fbc;
    const ga = readCookie("_ga")?.split(".").slice(-2).join(".");
    return { ...a, ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}), ...(ga ? { ga_client_id: ga } : {}), ...openAiRefs() };
  } catch {
    return {};
  }
}

const CLICK_IDS = ["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid", "li_fat_id"] as const;
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const ATTR_COOKIE_DAYS = 90;

/**
 * First touch is written once and never overwritten. Every later visit that carries UTMs or a click
 * ID updates the last_* fields (and refreshes that click ID), so both first- and last-touch reach the
 * CRM. Mirrored to a first-party cookie (90 days) so it survives localStorage clears on iOS.
 */
export function mergeAttribution(existing: Record<string, string | number>, params: URLSearchParams, ctx: { path: string; referrer: string; now: string; host?: string }) {
  const found: Record<string, string> = {};
  [...UTM, ...CLICK_IDS].forEach((k) => {
    const v = params.get(k);
    if (v) found[k] = v.slice(0, 300);
  });
  if (found.fbclid) found.fbc = `fb.1.${Date.parse(ctx.now)}.${found.fbclid}`;
  const externalRef = ctx.referrer && !(ctx.host && ctx.referrer.includes(ctx.host)) ? ctx.referrer.slice(0, 500) : "";
  if (!Object.keys(existing).length) {
    return { ...found, ...(found.gclid ? { gclid_at: ctx.now } : {}), landing_page: ctx.path.slice(0, 500), referrer: externalRef, first_touch_at: ctx.now, touches: 1 };
  }
  const isCampaignTouch = Object.keys(found).length > 0;
  if (!isCampaignTouch) return existing;
  const clicks: Record<string, string> = {};
  CLICK_IDS.forEach((k) => { if (found[k]) clicks[k] = found[k]; });
  return {
    ...existing,
    ...clicks,
    ...(found.fbc ? { fbc: found.fbc } : {}),
    ...(found.gclid ? { gclid_at: ctx.now } : {}),
    last_utm_source: found.utm_source ?? "", last_utm_medium: found.utm_medium ?? "", last_utm_campaign: found.utm_campaign ?? "",
    last_utm_term: found.utm_term ?? "", last_utm_content: found.utm_content ?? "",
    last_landing_page: ctx.path.slice(0, 500), last_referrer: externalRef, last_touch_at: ctx.now,
    touches: Number(existing.touches ?? 1) + 1,
  };
}

function captureAttribution() {
  try {
    let existing = JSON.parse(localStorage.getItem(ATTR_KEY) || "null");
    if (!existing) {
      const c = readCookie(ATTR_KEY);
      existing = c ? JSON.parse(decodeURIComponent(c)) : {};
    }
    const merged = mergeAttribution(existing, new URLSearchParams(location.search), { path: location.pathname + location.search, referrer: document.referrer, now: new Date().toISOString(), host: location.host });
    const json = JSON.stringify(merged);
    localStorage.setItem(ATTR_KEY, json);
    if (json.length < 3500) document.cookie = `${ATTR_KEY}=${encodeURIComponent(json)}; Max-Age=${ATTR_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* storage unavailable */
  }
}

export default function Tracking() {
  const [showBanner, setShowBanner] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const service = pathname ? serviceFromPath(pathname) : null;
    if (service) track("view_service", { service, page_path: pathname });
  }, [pathname]);

  useEffect(() => {
    captureAttribution();
    let c: string | null = null;
    try {
      c = localStorage.getItem(CONSENT_KEY);
    } catch {}
    if (c === "granted") updateConsent(true);
    else if (c === null && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
      // GPC = opt-out signal: record a decline and never show ad tags.
      try { localStorage.setItem(CONSENT_KEY, "denied"); } catch {}
      return;
    }
    else if (c !== "denied") setShowBanner(true);
  }, []);

  function updateConsent(granted: boolean) {
    const v = granted ? "granted" : "denied";
    window.gtag?.("consent", "update", { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
    oaiqConsent(granted && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true);
    if (granted) loadAdTags();
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {}
    setShowBanner(false);
  }

  return (
    <>
      {GTM && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');
        `}</Script>
      )}
      {OPENAI_PIXEL_ID && (
        // OpenAI Ads (ChatGPT) pixel. Opt-in: consent stays false until the visitor clicks Accept.
        <Script id="openai-pixel" strategy="afterInteractive">{oaiqSnippet(OPENAI_PIXEL_ID, "localStorage.getItem('pw_consent')==='granted'&&navigator.globalPrivacyControl!==true")}</Script>
      )}
      {showBanner && (
        <div role="dialog" aria-label="Cookie consent" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl card p-4 shadow-lg text-sm flex flex-col sm:flex-row gap-3 sm:items-center">
          <p className="text-slate flex-1">
            We use cookies to measure which advertising and pages bring in project requests. See our <a className="underline" href="/privacy">privacy policy</a>.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-ghost !py-2 text-slate" onClick={() => updateConsent(false)}>Decline</button>
            <button className="btn btn-dark !py-2" onClick={() => updateConsent(true)}>Accept</button>
          </div>
        </div>
      )}
    </>
  );
}
