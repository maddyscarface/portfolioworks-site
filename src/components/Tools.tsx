"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { planScope, vacancyCost, planPortfolio, type ScopeInput, type PlannerInput } from "@/lib/planning-tools";
import { track } from "@/components/Tracking";
import LeadForm from "@/components/LeadForm";
import type { MarketId } from "@/config/markets";

/** Vacancy calculator only: formats the CUSTOMER'S OWN rent figures (never our prices). Blank until they type. */
const usd = (n: number) => (n > 0 ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—");

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button type="button" key={v} className="chip !text-[0.8rem] !py-1.5" data-on={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Tool A: Unit Turnover Scope Planner (Phase 4: no prices) ─────────── */
export function TurnoverEstimator({ embedded = false }: { embedded?: boolean }) {
  const [i, setI] = useState<ScopeInput>({
    zip: "",
    unitType: "apartment",
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    painting: "full",
    flooring: "lvpPartial",
    kitchen: "refresh",
    bathroom: "refresh",
    carpentry: "minor",
    damage: "moderate",
    occupied: false,
    targetMoveIn: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [used, setUsed] = useState(false);
  const r = useMemo(() => planScope(i), [i]);
  const up = <K extends keyof ScopeInput>(k: K, v: ScopeInput[K]) => {
    if (!used) {
      setUsed(true);
      track("estimator_used", { tool: "unit_turn_scope" });
    }
    setI((p) => ({ ...p, [k]: v }));
  };

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6" data-testid="turn-estimator">
      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="ezip">Property ZIP</label>
            <input id="ezip" className="input" inputMode="numeric" maxLength={5} value={i.zip} onChange={(e) => up("zip", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div><label className="label" htmlFor="ebd">Bedrooms</label><input id="ebd" type="number" min={0} max={10} className="input" value={i.bedrooms} onChange={(e) => up("bedrooms", Number(e.target.value))} /></div>
          <div><label className="label" htmlFor="eba">Bathrooms</label><input id="eba" type="number" min={1} max={6} className="input" value={i.bathrooms} onChange={(e) => up("bathrooms", Number(e.target.value))} /></div>
          <div><label className="label" htmlFor="esf">Approx. sq ft</label><input id="esf" type="number" min={200} step={50} className="input" value={i.sqft} onChange={(e) => up("sqft", Number(e.target.value))} /></div>
        </div>
        <Seg label="Unit type" value={i.unitType} onChange={(v) => up("unitType", v)} options={[["apartment", "Apartment"], ["condo", "Condo"], ["multi-family-unit", "2–4 family unit"], ["townhouse", "Townhouse"], ["single-family", "Single-family"]]} />
        <Seg label="Painting" value={i.painting} onChange={(v) => up("painting", v)} options={[["none", "None"], ["touchup", "Patch & touch-up"], ["full", "Full repaint"], ["full-ceilings", "Full + ceilings"]]} />
        <Seg label="Flooring" value={i.flooring} onChange={(v) => up("flooring", v)} options={[["none", "None"], ["repair", "Repairs"], ["lvpPartial", "LVP some rooms"], ["lvpFull", "LVP most of unit"], ["hardwoodRefinish", "Refinish hardwood"]]} />
        <Seg label="Kitchen" value={i.kitchen} onChange={(v) => up("kitchen", v)} options={[["none", "None"], ["refresh", "Refresh"], ["upgrade", "Upgrade"], ["full", "Full renovation"]]} />
        <Seg label="Bathroom(s)" value={i.bathroom} onChange={(v) => up("bathroom", v)} options={[["none", "None"], ["refresh", "Refresh"], ["upgrade", "Upgrade"], ["full", "Full renovation"]]} />
        <Seg label="Carpentry & repairs" value={i.carpentry} onChange={(v) => up("carpentry", v)} options={[["none", "None"], ["minor", "A few items"], ["moderate", "Moderate list"], ["major", "Extensive"]]} />
        <Seg label="Overall condition" value={i.damage} onChange={(v) => up("damage", v)} options={[["light", "Light wear"], ["moderate", "Moderate"], ["heavy", "Heavy damage"]]} />
        <Seg label="Is the unit occupied?" value={i.occupied ? "yes" : "no"} onChange={(v) => up("occupied", v === "yes")} options={[["no", "Vacant"], ["yes", "Occupied"]]} />
        <div className="max-w-xs"><label className="label" htmlFor="emi">Target move-in date</label><input id="emi" type="date" className="input" value={i.targetMoveIn} onChange={(e) => up("targetMoveIn", e.target.value)} /></div>
      </div>

      <div className="space-y-4">
        <div className="bg-navy text-paper p-6 rounded-[3px]" data-testid="scope-plan">
          <p className="eyebrow !text-bronze-2">Scope plan · no prices online</p>
          <p className="text-2xl sm:text-3xl mt-2" data-testid="scope-intensity">{r.intensity === "heavy" ? "Heavy turn" : r.intensity === "moderate" ? "Moderate turn" : "Light turn"}</p>
          <p className="text-paper/70 text-xs mt-2" data-testid="scope-market">{i.zip.length === 5 ? r.marketNote : "Enter the property ZIP to check the service area"}</p>
          <div className="mt-5 divide-y divide-white/10 text-sm">
            {r.items.map((it) => (
              <div key={it.label} className="py-2"><span className="text-paper/50 text-xs block">{it.category}</span>{it.label}</div>
            ))}
          </div>
        </div>
        <div className="card p-5 text-sm">
          <p className="font-semibold text-navy mb-2">Scheduling and access</p>
          <ul className="space-y-1.5 text-slate list-disc pl-4">{r.schedule.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="font-semibold text-navy mt-4 mb-2">What to send with your request</p>
          <ul className="space-y-1.5 text-slate list-disc pl-4">{r.bring.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <p className="text-[0.72rem] text-slate leading-relaxed" data-testid="scope-disclaimer">{r.disclaimer}</p>
        {!showForm ? (
          <button className="btn btn-primary w-full" onClick={() => { setShowForm(true); track("estimator_cta", { tool: "unit_turn_scope" }); }}>
            Submit this unit for a written scope →
          </button>
        ) : (
          <LeadForm funnel="turnover" defaultServices={["rental-turnovers"]} estimatorSnapshot={{ input: i, intensity: r.intensity, items: r.items.map((x) => x.label) }} />
        )}
        {embedded && <Link href="/unit-turn-estimator" className="block text-center text-sm underline text-slate">Open the full scope planner</Link>}
      </div>
    </div>
  );
}

/* ─────────── Tool B ─────────── */
export function VacancyCalculator() {
  const [v, setV] = useState({ monthlyRent: 0, estimatedDaysVacant: 30, renovationDays: 18, acceleratedRenovationDays: 8 });
  const r = vacancyCost(v);
  const field = (k: keyof typeof v, label: string, suffix?: string) => (
    <div>
      <label className="label" htmlFor={`v-${k}`}>{label}</label>
      <div className="relative">
        <input id={`v-${k}`} type="number" min={0} className="input" placeholder={k === "monthlyRent" ? "Your rent" : undefined} value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate">{suffix}</span>}
      </div>
    </div>
  );
  return (
    <div className="grid lg:grid-cols-2 gap-6" data-testid="vacancy-calc">
      <div className="card p-6 grid sm:grid-cols-2 gap-4 content-start">
        {field("monthlyRent", "Your monthly rent", "per month")}
        {field("estimatedDaysVacant", "Expected days vacant (current process)", "days")}
        {field("renovationDays", "Renovation duration (current)", "days")}
        {field("acceleratedRenovationDays", "Proposed accelerated duration", "days")}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5"><p className="text-xs text-slate">Daily gross rent equivalent</p><p className="num text-3xl text-navy mt-1">{usd(r.dailyRent)}</p></div>
          <div className="card p-5"><p className="text-xs text-slate">Days of renovation removed</p><p className="num text-3xl text-navy mt-1">{r.daysDifference}</p></div>
          <div className="card p-5"><p className="text-xs text-slate">Vacancy exposure — current</p><p className="num text-3xl text-navy mt-1">{usd(r.currentExposure)}</p><p className="text-xs text-slate mt-1">{v.estimatedDaysVacant} days</p></div>
          <div className="card p-5 border-bronze"><p className="text-xs text-slate">Vacancy exposure — accelerated</p><p className="num text-3xl text-bronze mt-1">{usd(r.acceleratedExposure)}</p><p className="text-xs text-slate mt-1">{r.acceleratedDaysVacant} days</p></div>
        </div>
        <div className="bg-navy text-paper p-5 rounded-[3px] flex justify-between items-center">
          <span className="text-sm">Scenario difference (gross rent equivalent)</span>
          <span className="num text-3xl">{usd(r.difference)}</span>
        </div>
        <p className="text-[0.72rem] text-slate">{r.note}</p>
        <p className="text-xs text-slate" data-testid="vacancy-assumption-date">Uses only the figures you enter. Nothing is sent or stored, and it isn&rsquo;t a quote.</p>
      </div>
    </div>
  );
}

/* ─────────── Tool C ─────────── */
export function PortfolioPlanner() {
  const [p, setP] = useState<PlannerInput>({ units: 48, annualTurnoverRate: 35, locations: ["massachusetts"], typicalScope: "standard", challenges: [] });
  const r = planPortfolio(p);
  const toggleLoc = (m: MarketId) => setP({ ...p, locations: p.locations.includes(m) ? p.locations.filter((x) => x !== m) : [...p.locations, m] });
  const CH = ["Contractors slow to respond", "Scheduling delays", "Inconsistent pricing / bids", "Unfinished punch lists", "Poor documentation", "Too many vendors"];
  const toggleCh = (c: string) => setP({ ...p, challenges: p.challenges.includes(c) ? p.challenges.filter((x) => x !== c) : [...p.challenges, c] });
  return (
    <div className="grid lg:grid-cols-2 gap-6" data-testid="portfolio-planner">
      <div className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label" htmlFor="pu">Units</label><input id="pu" type="number" min={1} className="input" value={p.units} onChange={(e) => setP({ ...p, units: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="pr">Annual turnover %</label><input id="pr" type="number" min={0} max={100} className="input" value={p.annualTurnoverRate} onChange={(e) => setP({ ...p, annualTurnoverRate: Number(e.target.value) })} /></div>
        </div>
        <div>
          <span className="label">Property locations</span>
          <div className="flex flex-wrap gap-2">
            {([["massachusetts", "Greater Boston"], ["florida", "Southeast Florida (not served yet)"], ["maine", "Southern Maine (not served yet)"]] as [MarketId, string][]).map(([m, l]) => (
              <button key={m} type="button" className="chip" data-on={p.locations.includes(m)} onClick={() => toggleLoc(m)}>{l}</button>
            ))}
          </div>
          {p.locations.some((m) => m !== "massachusetts") && <p className="text-xs text-slate mt-2" data-testid="planner-market-note">We currently serve Greater Boston (Massachusetts) only. Florida and Maine are not live markets.</p>}
        </div>
        <Seg label="Typical turnover scope" value={p.typicalScope} onChange={(v) => setP({ ...p, typicalScope: v })} options={[["light", "Light (paint & touch-up)"], ["standard", "Standard (paint, floors, fixtures)"], ["heavy", "Heavy (kitchen/bath work)"]]} />
        <div>
          <span className="label">Current contractor challenges</span>
          <div className="flex flex-wrap gap-2">{CH.map((c) => <button key={c} type="button" className="chip !text-[0.8rem]" data-on={p.challenges.includes(c)} onClick={() => toggleCh(c)}>{c}</button>)}</div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4"><p className="text-xs text-slate">Est. turns / year</p><p className="num text-3xl text-navy">{r.annualTurns}</p></div>
          <div className="card p-4"><p className="text-xs text-slate">Avg / month</p><p className="num text-3xl text-navy">{r.monthlyTurns}</p></div>
        </div>
        <div className="card p-5">
          <p className="font-semibold text-navy text-sm mb-3">Work planning schedule</p>
          <div className="space-y-2">
            {r.schedule.map((q) => (
              <div key={q.quarter} className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-center text-sm">
                <span className="num text-bronze">{q.quarter}</span>
                <div><div className="h-2 bg-paper-2"><div className="h-2 bg-navy" style={{ width: `${r.annualTurns ? (q.turns / Math.max(...r.schedule.map((x) => x.turns), 1)) * 100 : 0}%` }} /></div><p className="text-xs text-slate mt-1">{q.focus}</p></div>
                <span className="num">{q.turns}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate mt-3">Typical peak move months: {r.peakMonths.join(", ")}</p>
        </div>
        <div className="card p-5 text-sm">
          <p className="font-semibold text-navy mb-2">Indicative project categories</p>
          <div className="flex flex-wrap gap-1.5">{r.categories.map((c) => <span key={c} className="text-xs bg-bronze-soft px-2 py-1">{c}</span>)}</div>
        </div>
        <p className="text-xs text-slate" data-testid="planner-assumption-date">Planning-only volume and seasonality assumptions. No prices are shown online; a portfolio rate card follows a consultation.</p>
        <details className="text-xs text-slate"><summary className="cursor-pointer">Assumptions used</summary><ul className="list-disc pl-4 mt-2 space-y-1">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
        <div className="border-l-4 border-bronze pl-4 text-sm">{r.nextStep}</div>
        <Link href="/portfolio-programs#consultation" className="btn btn-primary w-full">Discuss a Portfolio Program →</Link>
      </div>
    </div>
  );
}
