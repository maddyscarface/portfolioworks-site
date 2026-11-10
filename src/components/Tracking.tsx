"use client";
/**
 * GTM + Consent Mode v2 + first-party attribution capture.
 * - Consent defaults to denied for ad_storage/ad_user_data/ad_personalization until the visitor accepts.
 * - Attribution (UTMs + click IDs + landing page) is stored first-touch in localStorage and
 *   attached to every lead submission.
 */
import Script from "next/script";
import { useEffect, useState } from "react";
import { OPENAI_PIXEL_ID, oaiqConsent, oaiqSnippet, openAiRefs } from "@/lib/openai-ads/client";

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

function captureAttribution() {
  try {
    const p = new URLSearchParams(location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"];
    const found: Record<string, string> = {};
    keys.forEach((k) => {
      const v = p.get(k);
      if (v) found[k] = v.slice(0, 300);
    });
    const existing = JSON.parse(localStorage.getItem(ATTR_KEY) || "{}");
    if (found.fbclid) found.fbc = `fb.1.${Date.now()}.${found.fbclid}`;
    // first touch wins for source fields; click IDs refresh on each paid click
    const merged = Object.keys(existing).length
      ? { ...existing, ...(found.gclid ? { gclid: found.gclid } : {}), ...(found.fbclid ? { fbclid: found.fbclid, fbc: found.fbc } : {}) }
      : { ...found, landing_page: location.pathname + location.search, referrer: document.referrer.slice(0, 500), first_touch_at: new Date().toISOString() };
    localStorage.setItem(ATTR_KEY, JSON.stringify(merged));
  } catch {
    /* storage unavailable */
  }
}

export default function Tracking() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    captureAttribution();
    let c: string | null = null;
    try {
      c = localStorage.getItem(CONSENT_KEY);
    } catch {}
    if (c === "granted") updateConsent(true);
    else if (c !== "denied") setShowBanner(true);
  }, []);

  function updateConsent(granted: boolean) {
    const v = granted ? "granted" : "denied";
    window.gtag?.("consent", "update", { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
    oaiqConsent(granted && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true);
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
