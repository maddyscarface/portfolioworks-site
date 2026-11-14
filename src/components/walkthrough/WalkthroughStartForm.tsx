"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adsConsentGranted, getAttribution, track } from "@/components/Tracking";
import Turnstile, { TURNSTILE_SITE_KEY } from "@/components/Turnstile";

type Choice = { id: string; label: string; short: string };
const TYPES: [string, string][] = [
  ["landlord", "Landlord (1–10 units)"], ["portfolio-owner", "Portfolio owner (10+)"], ["property-manager", "Property manager"],
  ["investor", "Investor / operator"], ["hoa", "HOA / condo board"], ["other", "Other"],
];
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Starts a private walkthrough. Contact + consent first, then the server creates the project and a private link. */
export function WalkthroughStartForm({ services, presetService }: { services: Choice[]; presetService?: string }) {
  const eventId = useRef("");
  const startedAt = useRef(0);
  useEffect(() => { eventId.current = newId(); startedAt.current = Date.now(); }, []);
  const [v, setV] = useState({ service: presetService ?? "", customerType: "landlord", firstName: "", lastName: "", email: "", phone: "", company: "", propertyAddress: "", zip: "", units: "1", consentContact: false, consentSms: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const onTurnstile = useCallback((t: string) => setTurnstileToken(t), []);
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));

  async function go() {
    const e: Record<string, string> = {};
    if (!v.service) e.service = "Choose the type of work";
    if (!v.firstName.trim()) e.firstName = "First name is required";
    if (!v.lastName.trim()) e.lastName = "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email";
    if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a phone number";
    if (!/^\d{5}$/.test(v.zip)) e.zip = "5-digit ZIP";
    if (!v.consentContact) e.consentContact = "Please agree so we can follow up";
    if (TURNSTILE_SITE_KEY && !turnstileToken) e.turnstile = "Please complete the check";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true); setServerErr("");
    try {
      const payload = {
        service: v.service, funnel: "walkthrough", customerType: v.customerType, firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone,
        company: v.company, propertyAddress: v.propertyAddress, zip: v.zip, units: Number(v.units || 1), properties: 1, services: [], consentContact: true, consentSms: v.consentSms,
        adsConsent: adsConsentGranted(), eventId: eventId.current, attribution: getAttribution(), website: v.website, startedAt: startedAt.current, ...(turnstileToken ? { turnstileToken } : {}),
      };
      const r = await fetch("/api/walkthrough/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (j.ok && j.url) { track("walkthrough_started", { event_id: eventId.current, service: v.service }); window.location.assign(j.url); return; }
      if (j.ok) { setServerErr("Thanks. We received your request."); return; }
      if (j.fields) setErrors(j.fields);
      setServerErr(j.error ?? "Please check the form.");
    } catch { setServerErr("Network problem. Please try again."); }
    finally { setBusy(false); }
  }
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-red-700" role="alert">{errors[k]}</p> : null);
  const input = (k: "firstName" | "lastName" | "email" | "phone" | "company" | "propertyAddress" | "zip" | "units", label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={`wt-${k}`}>{label}</label><input id={`wt-${k}`} className="input" value={v[k]} onChange={(e) => set(k, k === "zip" || k === "units" ? e.target.value.replace(/\D/g, "") : e.target.value)} {...props} />{err(k)}</div>
  );

  return (
    <form className="card space-y-6 p-6 md:p-8" onSubmit={(e) => { e.preventDefault(); go(); }} data-testid="walkthrough-start" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden value={v.website} onChange={(e) => set("website", e.target.value)} />
      <div>
        <p className="label">What kind of work? *</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Type of work">
          {services.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={v.service === s.id} className="chip min-h-[52px] !justify-start text-left" data-on={v.service === s.id} data-testid={`svc-${s.id}`} onClick={() => set("service", s.id)}>
              <span><b className="block">{s.label}</b><span className="text-xs font-normal opacity-80">{s.short}</span></span>
            </button>
          ))}
        </div>
        {err("service")}
      </div>
      <div>
        <p className="label">I&rsquo;m a</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(([id, l]) => <button key={id} type="button" className="chip min-h-11 text-sm" aria-pressed={v.customerType === id} onClick={() => set("customerType", id)}>{l}</button>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {input("firstName", "First name *", { autoComplete: "given-name" })}
        {input("lastName", "Last name *", { autoComplete: "family-name" })}
        {input("email", "Email *", { type: "email", autoComplete: "email" })}
        {input("phone", "Phone *", { type: "tel", autoComplete: "tel" })}
        {input("company", "Company (optional)", { autoComplete: "organization" })}
        {input("propertyAddress", "Property address (optional)", { autoComplete: "street-address" })}
        {input("zip", "Property ZIP *", { inputMode: "numeric", maxLength: 5, autoComplete: "postal-code" })}
        {input("units", "Units in scope", { inputMode: "numeric", maxLength: 4 })}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-slate">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={v.consentContact} onChange={(e) => set("consentContact", e.target.checked)} data-testid="wt-consent" />
        <span>I agree PortfolioWorks may contact me by phone and email about this request. *</span>
      </label>
      {err("consentContact")}
      <label className="flex min-h-11 items-center gap-3 text-xs text-slate">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={v.consentSms} onChange={(e) => set("consentSms", e.target.checked)} />
        <span>Optional: text messages about scheduling for this request. Msg &amp; data rates may apply. Reply STOP to opt out. Not a condition of service.</span>
      </label>
      <Turnstile onToken={onTurnstile} />
      {err("turnstile")}
      {serverErr && <p className="text-sm text-red-700" role="alert">{serverErr}</p>}
      <button type="submit" className="btn btn-primary w-full min-h-12" disabled={busy} data-testid="walkthrough-start-submit">{busy ? "Starting…" : "Start my walkthrough"}</button>
      <p className="text-xs text-slate">You&rsquo;ll get a private link on the next screen. Bookmark it to come back later. No prices are shown online, and submitting doesn&rsquo;t commit you to any work.</p>
    </form>
  );
}
