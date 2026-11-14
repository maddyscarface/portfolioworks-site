"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adsConsentGranted, getAttribution, track } from "@/components/Tracking";
import { EstimateQualifiers, validateQualifiers, withPricingSeen } from "@/components/estimate/EstimateQualifiers";
import { BUDGET_TO_LEGACY, estimateConfig, qualifierTheme } from "@/config/estimate";
import { oaiqLead } from "@/lib/openai-ads/client";
import { trackLeadConversion } from "@/lib/tracking/pixels";
import Turnstile, { TURNSTILE_SITE_KEY } from "@/components/Turnstile";
import type { Qualifiers } from "@/lib/estimate/qualifiers";
import { FUNNEL_FIELDS, funnelGroup } from "@/config/funnel-fields";

/** First service ticked → estimate project type (pre-selects the Budget & walkthrough step). */
const SERVICE_TO_PROJECT: Record<string, string> = {
  "rental-turnovers": "turnover", "painting-drywall": "painting", flooring: "flooring", "bathroom-remodeling": "bathroom",
  "kitchen-remodeling": "kitchen", "full-rehab": "rehab", "capital-improvements": "rehab", "exterior-repairs": "exterior", carpentry: "turnover",
};
import type { Funnel } from "@/lib/leads";

type CustomerType = "landlord" | "portfolio-owner" | "property-manager" | "investor" | "broker" | "hoa" | "homeowner" | "other";

const SERVICE_OPTIONS = [
  ["rental-turnovers", "Turnover / make-ready"],
  ["painting-drywall", "Painting & drywall"],
  ["flooring", "Flooring"],
  ["bathroom-remodeling", "Bathroom"],
  ["kitchen-remodeling", "Kitchen"],
  ["carpentry", "Carpentry & repairs"],
  ["exterior-repairs", "Exterior / decks / porches"],
  ["plumbing-electrical-hvac-coordination", "Plumbing / electrical / HVAC"],
  ["full-rehab", "Full rehab"],
  ["capital-improvements", "Capital improvements"],
  ["property-maintenance", "Recurring maintenance program"],
  ["handyman", "Handyman punch list"],
  ["cleaning", "Make-ready cleaning"],
] as const;

const TYPE_OPTIONS: [CustomerType, string][] = [
  ["landlord", "Independent landlord (1–10 units)"],
  ["portfolio-owner", "Portfolio owner (10+ units)"],
  ["property-manager", "Property manager"],
  ["investor", "Multifamily investor / operator"],
  ["hoa", "HOA / condo board"],
  ["homeowner", "Homeowner (my own residence)"],
  ["broker", "Realtor / broker"],
  ["other", "Other"],
];

const FUNNEL_COPY: Record<Funnel, { title: string; step2: string }> = {
  turnover: { title: "Turnover request", step2: "Unit & timing" },
  portfolio: { title: "Portfolio program consultation", step2: "Portfolio details" },
  rehab: { title: "Renovation estimate request", step2: "Project details" },
  trade: { title: "Trade work request", step2: "Scope details" },
  urgent: { title: "Time-sensitive turnover", step2: "Unit & deadline" },
  walkthrough: { title: "Property walkthrough request", step2: "Property details" },
  contact: { title: "Contact", step2: "Details" },
};

export interface LeadFormProps {
  funnel: Funnel;
  defaultType?: CustomerType;
  defaultServices?: string[];
  compact?: boolean;
  estimatorSnapshot?: Record<string, unknown>;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function LeadForm({ funnel, defaultType, defaultServices = [], estimatorSnapshot }: LeadFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const eventId = useRef<string>("");
  const startedAt = useRef<number>(0);
  const started = useRef(false);
  const [f, setF] = useState({
    customerType: defaultType ?? ("" as CustomerType | ""),
    deliveryMode: "unsure" as "turnkey" | "a-la-carte" | "unsure",
    services: defaultServices,
    zip: "",
    propertyAddress: "",
    units: funnel === "portfolio" ? "" : "1",
    properties: "1",
    moveOutDate: "",
    targetMoveIn: "",
    timeline: funnel === "urgent" ? "asap" : "planning",
    budget: "unknown",
    contractType: funnel === "portfolio" ? "recurring" : "unsure",
    description: "",
    photoLinks: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    consentContact: false,
    consentSms: false,
    website: "",
  });

  useEffect(() => {
    eventId.current = newId();
    startedAt.current = Date.now();
  }, []);

  const set = (k: keyof typeof f, v: unknown) => {
    if (!started.current) {
      started.current = true;
      track("form_start", { funnel });
    }
    setF((p) => ({ ...p, [k]: v }));
  };
  const toggleSvc = (s: string) => set("services", f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s]);

  // Estimate funnels get a Budget & walkthrough step; partnership and contact forms stay short.
  const withQ = funnel !== "portfolio" && funnel !== "contact";
  const steps = withQ ? ["Who & what", FUNNEL_COPY[funnel].step2, "Budget & walkthrough", "Contact"] : ["Who & what", FUNNEL_COPY[funnel].step2, "Contact"];
  const last = steps.length - 1;
  const qStep = withQ ? 2 : -1;
  const [q, setQ] = useState<Qualifiers>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const group = funnelGroup(funnel);
  const setD = (k: string, v: string) => setDetails((d) => ({ ...d, [k]: v }));
  const toggleD = (k: string, v: string) => setDetails((d) => {
    const cur = (d[k] ?? "").split(",").filter(Boolean);
    return { ...d, [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") };
  });
  const qErrors = useMemo(() => (withQ ? validateQualifiers(estimateConfig, q, ["address"]) : {}), [withQ, q]);
  const isTurn = funnel === "turnover" || funnel === "urgent";
  const isPortfolio = funnel === "portfolio" || ["property-manager", "portfolio-owner", "hoa"].includes(f.customerType);

  const [turnstileToken, setTurnstileToken] = useState("");
  const onTurnstile = useCallback((t: string) => setTurnstileToken(t), []);
  const stepValid = useMemo(() => {
    if (step === 0) return Boolean(f.customerType) && (funnel === "contact" || f.services.length > 0);
    if (step === 1) return /^\d{5}$/.test(f.zip) && (!isPortfolio || Number(f.units) > 0);
    if (step === qStep) return Object.keys(qErrors).length === 0;
    return f.firstName && f.lastName && /\S+@\S+\.\S+/.test(f.email) && f.phone.replace(/\D/g, "").length >= 10 && f.consentContact && (!TURNSTILE_SITE_KEY || Boolean(turnstileToken));
  }, [step, f, funnel, isPortfolio, qStep, qErrors, turnstileToken]);

  async function submit() {
    setBusy(true);
    setErr(null);
    const photoUrls = f.photoLinks
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s))
      .slice(0, 20);
    const payload = {
      funnel,
      customerType: f.customerType,
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      phone: f.phone,
      company: f.company,
      role: f.role,
      propertyAddress: f.propertyAddress,
      zip: f.zip,
      units: Number(f.units || 0),
      properties: Number(f.properties || 1),
      services: f.services,
      deliveryMode: f.deliveryMode,
      timeline: withQ && q.start ? q.start : f.timeline,
      budget: withQ && q.budget ? BUDGET_TO_LEGACY[q.budget] ?? "unknown" : f.budget,
      qualifiers: withQ ? withPricingSeen(q) : undefined,
      details: group ? details : undefined,
      adsConsent: adsConsentGranted(),
      contractType: f.contractType,
      description: f.description,
      moveOutDate: f.moveOutDate,
      targetMoveIn: f.targetMoveIn,
      photoUrls,
      estimatorSnapshot,
      consentContact: f.consentContact,
      consentSms: f.consentSms,
      eventId: eventId.current,
      attribution: getAttribution(),
      website: f.website,
      startedAt: startedAt.current,
      ...(turnstileToken ? { turnstileToken } : {}),
    };
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.issues?.[0]?.message ?? j.error ?? "Something went wrong");
      track("generate_lead", { event_id: eventId.current, funnel, customer_type: f.customerType, market: j.market ?? "out-of-area", lead_tier: j.tier });
      // OpenAI Ads pixel: same event_id as the server Conversions API call (deduplicated).
      if (adsConsentGranted()) {
        oaiqLead(eventId.current);
        // GA4 / Google Ads (enhanced conversions) / Meta Pixel — same event_id as the server CAPI events.
        trackLeadConversion({ eventId: eventId.current, funnel, tier: j.tier, email: f.email, phone: f.phone });
      }
      if (isTurn) track("property_intake_completed", { event_id: eventId.current, funnel });
      router.push(`/thank-you?f=${funnel}&t=${j.tier ?? ""}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form
      className="card p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(20,32,54,.35)] text-ink"
      onSubmit={(e) => {
        e.preventDefault();
        if (!stepValid) return;
        if (step < last) {
          if (step + 1 === qStep && !q.project_type) {
            const pt = f.services.map((s) => SERVICE_TO_PROJECT[s]).find(Boolean);
            if (pt) setQ((cur) => ({ ...cur, project_type: pt }));
          }
          setStep(step + 1);
        } else submit();
      }}
      aria-label={FUNNEL_COPY[funnel].title}
      data-testid="lead-form"
    >
      <div className="flex items-center justify-between mb-5">
        <p className="eyebrow">{FUNNEL_COPY[funnel].title}</p>
        <p className="text-xs text-slate">Step {step + 1} of {steps.length}</p>
      </div>
      <ol className={`grid ${steps.length === 4 ? "grid-cols-4" : "grid-cols-3"} gap-1.5 mb-6`} aria-hidden>
        {steps.map((s, i) => (
          <li key={s} className={`h-1 ${i <= step ? "bg-bronze" : "bg-line"}`} />
        ))}
      </ol>

      {/* honeypot — visually and layout-hidden so it cannot affect tap-target audits */}
      <div className="hidden" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="customerType">I am a…</label>
            <select id="customerType" className="input" value={f.customerType} onChange={(e) => set("customerType", e.target.value)} required name="customerType">
              <option value="">Select one</option>
              {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {funnel !== "contact" && (
            <>
              <div>
                <span className="label">How would you like the work delivered?</span>
                <div className="flex flex-wrap gap-2">
                  {([["turnkey", "Fully managed"], ["a-la-carte", "Specific trade(s) only"], ["unsure", "Help me decide"]] as const).map(([v, l]) => (
                    <button type="button" key={v} className="chip" data-on={f.deliveryMode === v} onClick={() => set("deliveryMode", v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">What do you need? <span className="font-normal text-slate">(select all that apply)</span></span>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map(([v, l]) => (
                    <button type="button" key={v} className="chip" data-on={f.services.includes(v)} onClick={() => toggleSvc(v)} aria-pressed={f.services.includes(v)}>{l}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="zip">Property ZIP *</label>
            <input id="zip" name="zip" className="input" inputMode="numeric" maxLength={5} value={f.zip} onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} required />
          </div>
          <div>
            <label className="label" htmlFor="addr">{funnel === "portfolio" ? "Primary property or office address" : "Property address"}</label>
            <input id="addr" className="input" value={f.propertyAddress} onChange={(e) => set("propertyAddress", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="units">{isPortfolio ? "Total units managed/owned *" : "Units involved"}</label>
            <input id="units" name="units" className="input" inputMode="numeric" value={f.units} onChange={(e) => set("units", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label className="label" htmlFor="props">Number of properties</label>
            <input id="props" className="input" inputMode="numeric" value={f.properties} onChange={(e) => set("properties", e.target.value.replace(/\D/g, ""))} />
          </div>
          {isTurn && (
            <>
              <div>
                <label className="label" htmlFor="mo">Move-out date</label>
                <input id="mo" type="date" className="input" value={f.moveOutDate} onChange={(e) => set("moveOutDate", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="mi">Next tenant move-in date</label>
                <input id="mi" type="date" className="input" value={f.targetMoveIn} onChange={(e) => set("targetMoveIn", e.target.value)} />
              </div>
            </>
          )}
          {group && FUNNEL_FIELDS[group].map((fd) => (
            <div key={fd.key} className={fd.full || fd.type === "chips" || fd.type === "textarea" ? "sm:col-span-2" : undefined}>
              {fd.type === "chips" ? (
                <>
                  <span className="label">{fd.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {fd.options!.map(([v, l]) => {
                      const on = (details[fd.key] ?? "").split(",").includes(v);
                      return <button type="button" key={v} className="chip" data-on={on} aria-pressed={on} onClick={() => toggleD(fd.key, v)}>{l}</button>;
                    })}
                  </div>
                </>
              ) : (
                <>
                  <label className="label" htmlFor={`d-${fd.key}`}>{fd.label}</label>
                  {fd.type === "select" ? (
                    <select id={`d-${fd.key}`} className="input" value={details[fd.key] ?? ""} onChange={(e) => setD(fd.key, e.target.value)}>
                      <option value="">Select…</option>
                      {fd.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : fd.type === "textarea" ? (
                    <textarea id={`d-${fd.key}`} rows={2} className="input" value={details[fd.key] ?? ""} placeholder={fd.placeholder} onChange={(e) => setD(fd.key, e.target.value)} />
                  ) : (
                    <input id={`d-${fd.key}`} className="input" value={details[fd.key] ?? ""} placeholder={fd.placeholder} onChange={(e) => setD(fd.key, e.target.value)} />
                  )}
                </>
              )}
            </div>
          ))}
          {!withQ && (<>
          <div>
            <label className="label" htmlFor="tl">{funnel === "portfolio" ? "When do you need coverage?" : "Timeline"}</label>
            <select id="tl" className="input" value={f.timeline} onChange={(e) => set("timeline", e.target.value)}>
              <option value="asap">As soon as possible</option>
              <option value="2-weeks">Within 2 weeks</option>
              <option value="30-days">Within 30 days</option>
              <option value="60-90-days">60–90 days</option>
              <option value="planning">Planning / budgeting</option>
            </select>
          </div>
          </>)}
          <div className="sm:col-span-2">
            <span className="label">Type of engagement</span>
            <div className="flex flex-wrap gap-2">
              {([["single-project", "One project"], ["recurring", "Ongoing / recurring work"], ["unsure", "Not sure"]] as const).map(([v, l]) => (
                <button type="button" key={v} className="chip" data-on={f.contractType === v} onClick={() => set("contractType", v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="desc">{isTurn ? "Unit condition & what needs doing" : funnel === "portfolio" ? "Anything else we should know before the consultation?" : "Describe the scope"}</label>
            <textarea id="desc" rows={3} className="input" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={isTurn ? "e.g. 2BR, tenant out 30 days, walls need patch/paint, kitchen floor damaged" : "Scope, condition, constraints, decision timeline"} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ph">{funnel === "rehab" ? "Photo, video or plan links" : "Photo or video links"} <span className="font-normal text-slate">(Google Drive, Dropbox, iCloud—optional)</span></label>
            <input id="ph" className="input" value={f.photoLinks} onChange={(e) => set("photoLinks", e.target.value)} placeholder="Paste links, or we'll send you a secure upload link" />
          </div>
        </div>
      )}

      {step === qStep && (
        <div>
          <p className="mb-4 text-sm text-slate">A few quick answers so your scope and price come with no surprises.</p>
          <EstimateQualifiers cfg={estimateConfig} value={q} onChange={setQ} theme={qualifierTheme} hide={["address"]} errors={q.project_type && q.size ? qErrors : {}} />
        </div>
      )}

      {step === last && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label" htmlFor="fn">First name *</label><input id="fn" name="firstName" className="input" autoComplete="given-name" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
          <div><label className="label" htmlFor="ln">Last name *</label><input id="ln" name="lastName" className="input" autoComplete="family-name" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div><label className="label" htmlFor="em">Email *</label><input id="em" name="email" type="email" className="input" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div><label className="label" htmlFor="pn">Phone *</label><input id="pn" name="phone" type="tel" className="input" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          {isPortfolio && (
            <>
              <div><label className="label" htmlFor="co">Company</label><input id="co" className="input" autoComplete="organization" value={f.company} onChange={(e) => set("company", e.target.value)} /></div>
              <div><label className="label" htmlFor="ro">Your role</label><input id="ro" className="input" value={f.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Director of Operations" /></div>
            </>
          )}
          <label className="sm:col-span-2 flex min-h-11 gap-3 text-sm text-slate items-center">
            <input type="checkbox" name="consentContact" className="h-5 w-5 shrink-0" checked={f.consentContact} onChange={(e) => set("consentContact", e.target.checked)} />
            <span>I agree PortfolioWorks may contact me by phone and email about this request. *</span>
          </label>
          <label className="sm:col-span-2 flex min-h-11 gap-3 text-xs text-slate items-center">
            <input type="checkbox" className="h-5 w-5 shrink-0" checked={f.consentSms} onChange={(e) => set("consentSms", e.target.checked)} />
            <span>Optional: I agree to receive text messages about my project (scheduling, updates) at the number above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. Consent is not a condition of service.</span>
          </label>
          <Turnstile onToken={onTurnstile} />
        </div>
      )}

      {err && <p role="alert" className="mt-4 text-sm text-red-700">{err}</p>}

      <div className="mt-7 flex items-center justify-between gap-3">
        {step > 0 ? <button type="button" className="btn btn-ghost min-h-11 text-sm text-slate" onClick={() => setStep(step - 1)}>Back</button> : <span />}
        <button type="submit" className="btn btn-primary disabled:opacity-40" disabled={!stepValid || busy} data-testid="form-next">
          {step < last ? "Continue" : busy ? "Sending…" : "Submit request"} <span aria-hidden>→</span>
        </button>
      </div>
      <p className="mt-4 text-[0.72rem] text-slate">A coordinator reviews every request. Submitting does not create a contract or commit you to any work.</p>
    </form>
  );
}
