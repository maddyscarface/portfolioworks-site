"use client";
import { useEffect, useMemo } from "react";
import { budgetFit, dateBounds, rangeText, typicalRange, type EstimateConfig, type Option, type Qualifiers } from "@/lib/estimate/qualifiers";
import { pricingViews, recordPricingView } from "@/lib/estimate/pricing-views";

export type QualifierTheme = {
  input: string;
  label: string;
  chip: string;
  chipOn: string;
  box: string;
  muted: string;
  link: string;
};

type Props = {
  cfg: EstimateConfig;
  value: Qualifiers;
  onChange: (q: Qualifiers) => void;
  theme: QualifierTheme;
  errors?: Partial<Record<keyof Qualifiers, string>>;
  /** Hide parts another step already asks (e.g. a site that collects the address elsewhere). */
  hide?: ("address" | "favorites" | "visit")[];
  /** false hides the typical range (e.g. a market without approved public pricing). */
  showRange?: boolean;
};

/** Adds the live pricing-view count to the answers just before submit. */
export function withPricingSeen(q: Qualifiers): Qualifiers {
  const { count } = pricingViews();
  return { ...q, saw_pricing: count > 0, pricing_views: count };
}

/** Client-side check used by the form's "Continue" button. */
export function validateQualifiers(cfg: EstimateConfig, q: Qualifiers, hide: Props["hide"] = []) {
  const e: Partial<Record<keyof Qualifiers, string>> = {};
  if (!q.project_type) e.project_type = "Choose a project type";
  else if (!q.size) e.size = "Choose the closest size";
  if (!q.budget) e.budget = "Choose a budget range (\"Not sure yet\" is fine)";
  if (!q.start) e.start = "Choose when you'd like to start";
  if (!hide.includes("address") && cfg.addressRequired && !q.address?.trim()) e.address = "Address is required for the visit";
  return e;
}

export function EstimateQualifiers({ cfg, value: q, onChange, theme: t, errors = {}, hide = [], showRange = true }: Props) {
  const set = (patch: Partial<Qualifiers>) => onChange({ ...q, ...patch });
  const pt = cfg.projectTypes.find((p) => p.id === q.project_type);
  const range = showRange ? typicalRange(cfg, q) : undefined;
  const fit = budgetFit(cfg, q);
  const bounds = useMemo(() => dateBounds(cfg), [cfg]);

  // Seeing the typical range in the form counts as seeing pricing.
  useEffect(() => { if (range) recordPricingView("form-range"); }, [range?.[0], range?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = (name: keyof Qualifiers, opts: Option[], multi = false) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={String(name)}>
      {opts.map((o) => {
        const cur = q[name];
        const on = multi ? Array.isArray(cur) && cur.includes(o.id) : cur === o.id;
        return (
          <button key={o.id} type="button" aria-pressed={on} data-testid={`q-${String(name)}-${o.id}`}
            className={on ? t.chipOn : t.chip}
            onClick={() => {
              if (multi) {
                const arr = (Array.isArray(cur) ? cur : []) as string[];
                set({ [name]: on ? arr.filter((x) => x !== o.id) : [...arr, o.id] } as Partial<Qualifiers>);
              } else if (name === "project_type") set({ project_type: o.id, size: undefined, add_ons: undefined });
              else set({ [name]: o.id } as Partial<Qualifiers>);
            }}>
            {o.label}{o.hint && <span className="block text-xs font-normal opacity-75">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
  const err = (k: keyof Qualifiers) => errors[k] ? <p className="mt-1 text-xs text-red-700" role="alert">{errors[k]}</p> : null;

  return (
    <div className="space-y-6" data-testid="estimate-qualifiers">
      <div>
        <p className={t.label}>What are you planning? *</p>
        {chips("project_type", cfg.projectTypes)}
        {err("project_type")}
      </div>

      {pt && (
        <div>
          <p className={t.label}>Closest size *</p>
          {chips("size", pt.sizes)}
          {err("size")}
        </div>
      )}

      {pt?.addOns?.length ? (
        <div>
          <p className={t.label}>Add-ons (optional)</p>
          {chips("add_ons", pt.addOns, true)}
        </div>
      ) : null}

      {range && (
        <div className={t.box} data-testid="typical-range" aria-live="polite">
          <p className="text-sm">Typical for this project: <strong className="text-lg">{rangeText(range)}</strong></p>
          <p className={`mt-1 text-xs ${t.muted}`}>{cfg.rangeNote} <a href={cfg.priceGuidePath} className={t.link} target="_blank" rel="noopener">See the full price guide</a></p>
        </div>
      )}

      <div>
        <p className={t.label}>What budget are you working with? *</p>
        {chips("budget", cfg.budgetBands)}
        {err("budget")}
        {showRange && fit.fit === "below" && (
          <p className={`mt-2 text-sm ${t.muted}`} data-testid="budget-below">{"That's under the typical range for this scope. That's okay: we'll suggest a phased or essentials option on the call."}</p>
        )}
      </div>

      <div>
        <p className={t.label}>When would you like to start? *</p>
        {chips("start", cfg.startOptions)}
        {err("start")}
      </div>

      {!hide.includes("visit") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={t.label}>Preferred {cfg.visitLabel} date</span>
            <input type="date" className={t.input} min={bounds.min} max={bounds.max} value={q.preferred_date ?? ""} data-testid="q-preferred_date"
              onChange={(e) => set({ preferred_date: e.target.value || undefined })} />
          </label>
          <label className="block">
            <span className={t.label}>Preferred time ({cfg.tzLabel})</span>
            <select className={t.input} value={q.preferred_window ?? ""} data-testid="q-preferred_window" onChange={(e) => set({ preferred_window: e.target.value || undefined })}>
              <option value="">Any time</option>
              {cfg.timeWindows.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </label>
          <p className={`text-xs sm:col-span-2 ${t.muted}`}>{"We'll confirm the exact time with you. This just helps us hold a slot."}</p>
        </div>
      )}

      {!hide.includes("favorites") && cfg.favorites.options.length > 0 && (
        <div>
          <p className={t.label}>{cfg.favorites.prompt}</p>
          {chips("favorites", cfg.favorites.options, true)}
        </div>
      )}

      {!hide.includes("address") && (
        <label className="block">
          <span className={t.label}>{cfg.addressLabel}{cfg.addressRequired ? " *" : ""}</span>
          <input className={t.input} autoComplete="street-address" value={q.address ?? ""} data-testid="q-address" onChange={(e) => set({ address: e.target.value })} />
          {err("address")}
        </label>
      )}
    </div>
  );
}
