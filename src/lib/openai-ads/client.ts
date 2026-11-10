/**
 * OpenAI Ads (ChatGPT ads) Measurement Pixel — browser side.
 *
 * - Loads https://bzrcdn.openai.com/sdk/oaiq.min.js only when NEXT_PUBLIC_OPENAI_PIXEL_ID is set.
 * - Consent is set BEFORE init (oaiq("consent", false) blocks pings and deletes __oppref/__obref).
 * - lead_created is measured with the same event_id the server sends to the Conversions API,
 *   so OpenAI keeps one conversion.
 * - The pixel itself captures ?oppref= into the __oppref cookie and creates __obref; we read
 *   both cookies and forward them to the server with the lead. If consent was denied the cookies
 *   do not exist, so nothing is forwarded.
 */

declare global {
  interface Window { oaiq?: (...args: unknown[]) => void }
}

export const OPENAI_PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID || "";
export const OAIQ_SRC = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

/**
 * Inline loader for a <Script> tag. `consentExpr` is a JS expression (evaluated in the page)
 * that is truthy only when advertising consent is granted.
 */
export function oaiqSnippet(pixelId: string, consentExpr: string, debug = process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG === "true") {
  return `(function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var js=d.createElement(s);js.async=true;js.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(js,f);})(window,document,"script",${JSON.stringify(OAIQ_SRC)});
var __oaiOk=false;try{__oaiOk=!!(${consentExpr});}catch(e){}
oaiq("consent",__oaiOk);oaiq("init",${JSON.stringify(debug ? { pixelId, debug: true } : { pixelId })});`;
}

export function oaiqConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  window.oaiq?.("consent", granted);
}

/** Browser half of the lead conversion. Safe to call when the pixel is not installed. */
export function oaiqLead(eventId: string) {
  if (typeof window === "undefined" || !window.oaiq) return;
  window.oaiq("measure", "lead_created", { type: "customer_action" }, { event_id: eventId });
}

export function oaiqCustom(name: string, eventId: string, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.oaiq) return;
  window.oaiq("measure", "custom", { type: "custom", ...data }, { event_id: eventId, custom_event_name: name });
}

function cookie(name: string) {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
  } catch { return undefined; }
}

/** First-party references to forward with a lead (only exist after ad consent). */
export function openAiRefs(): { openai_obref?: string; openai_oppref?: string } {
  if (typeof document === "undefined") return {};
  const obref = cookie("__obref")?.slice(0, 300);
  const oppref = cookie("__oppref")?.slice(0, 300);
  return { ...(obref ? { openai_obref: obref } : {}), ...(oppref ? { openai_oppref: oppref } : {}) };
}
