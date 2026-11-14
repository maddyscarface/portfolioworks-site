"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Line = { id: string; category: string; description: string; quantity: number | null; unit: string; rate: number | null; rate_source: "manual" | "pricebook" | null; notes?: string };
type Scope = { id: string; description: string; quantity: number | null; unit: string; source: "customer_tape" | "staff_verified" | "staff_entered"; measurement_ref?: string };
type Adj = { minimum: number | null; mobilization: number | null; waste_pct: number | null; tax_pct: number | null; margin_pct?: number | null };
type Calc = { complete: boolean; reason?: string; missing_lines?: string[]; line_sum?: number; waste?: number; mobilization?: number; cost?: number; margin_amount?: number; minimum_applied?: boolean; before_tax?: number; tax?: number; total?: number };
export type EstimateDTO = { id: string; project_id: string; status: string; revision: number; version: number; stale: boolean; stale_reason?: string; outcome: string | null; scope: Scope[]; lines: Line[]; adjustments: Adj; customer_scope_text: string; exclusions: string; notes_internal: string; calc: Calc; can_see_margin: boolean; approved_by?: string | null; approved_at?: string | null };
type PB = { id: string; category: string; description: string; unit: string; rate: number | null; approved: boolean };

const CATS = ["labor", "trades", "materials", "cleaning", "flooring", "fixtures", "disposal", "mobilization", "access", "schedule_contingency", "other"];
const OUTCOMES = [["ready_for_remote_quote", "Ready for remote quote"], ["targeted_follow_up", "Targeted follow-up"], ["live_video_walkthrough", "Live video walkthrough"], ["site_check", "Site check"]];
const n = (v: string) => (v.trim() === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
const usd = (v?: number) => (v === undefined ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const rid = () => `x${Math.random().toString(36).slice(2, 9)}`;

export function EstimateEditor({ initial, perms, pricebook }: { initial: EstimateDTO; perms: { write: boolean; approve: boolean; export: boolean; markSent: boolean }; pricebook: PB[] }) {
  const router = useRouter();
  const [e, setE] = useState(initial);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportsOut, setExports] = useState<{ id: string; format: string; file_name: string; href: string }[]>([]);
  const closed = ["superseded", "marked_sent"].includes(e.status);
  const ro = !perms.write || closed;
  const setLine = (i: number, patch: Partial<Line>) => setE({ ...e, lines: e.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const setScope = (i: number, patch: Partial<Scope>) => setE({ ...e, scope: e.scope.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  async function call(url: string, init: RequestInit, ok: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok || j.ok === false) { setMsg({ t: "err", m: j.error ?? `Failed (${r.status})` }); return null; }
    setMsg({ t: "ok", m: ok });
    return j;
  }
  async function save() {
    const { adjustments, ...rest } = e;
    const adj = { minimum: adjustments.minimum, mobilization: adjustments.mobilization, waste_pct: adjustments.waste_pct, tax_pct: adjustments.tax_pct, margin_pct: e.can_see_margin ? adjustments.margin_pct ?? null : null };
    const j = await call(`/admin/api/p4/estimates/${e.id}`, { method: "PATCH", body: JSON.stringify({ expected_version: e.version, outcome: rest.outcome ?? undefined, scope: rest.scope, lines: rest.lines, adjustments: adj, customer_scope_text: rest.customer_scope_text, exclusions: rest.exclusions, notes_internal: rest.notes_internal }) }, "Saved");
    if (j) { setE(j.estimate); router.refresh(); }
  }
  const reload = async () => { const r = await fetch(`/admin/api/p4/estimates/${e.id}`); const j = await r.json(); if (j.ok) setE(j.estimate); router.refresh(); };

  return (
    <div className="space-y-5" data-testid="estimate-editor">
      <div className="border-l-4 border-copper bg-cedar-soft p-4 text-sm"><b>Private estimate.</b> Customers never see this page, its numbers or its status. Nothing is sent automatically: export a DOCX/PDF after owner approval and deliver it yourself.</div>
      {e.stale && <div className="flex flex-wrap items-center justify-between gap-3 border border-[#e9c46a] bg-[#fbefd9] p-3 text-sm"><span>The customer&rsquo;s walkthrough changed ({e.stale_reason}). Review the project, then rebase this estimate.</span>{perms.write && <button className="btn btn-outline !min-h-9 !text-sm" disabled={busy} onClick={async () => { if (await call(`/admin/api/p4/estimates/${e.id}/refresh`, { method: "POST" }, "Rebased on the latest capture")) reload(); }}>Rebase on latest capture</button>}</div>}
      {msg && <p className={msg.t === "err" ? "err !text-sm" : "text-sm text-[#1f5130]"} role="status" data-testid="estimate-msg">{msg.m}</p>}

      <section className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Outcome</h2>
          <select className="field max-w-xs" disabled={ro} value={e.outcome ?? ""} onChange={(x) => setE({ ...e, outcome: x.target.value || null })}><option value="">Not decided</option>{OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </section>

      <section className="border border-line bg-white p-5">
        <h2 className="mb-3 font-semibold">Scope (quantities)</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="text-left text-xs text-stone uppercase"><th className="py-1">Description</th><th>Qty</th><th>Unit</th><th>Source</th><th /></tr></thead><tbody>
          {e.scope.map((s, i) => (
            <tr key={s.id} className="border-t border-bone-2">
              <td className="py-1.5 pr-2"><input className="field !min-h-9" disabled={ro} value={s.description} onChange={(x) => setScope(i, { description: x.target.value })} /></td>
              <td className="pr-2"><input className="field !min-h-9 w-24" disabled={ro} inputMode="decimal" value={s.quantity ?? ""} onChange={(x) => setScope(i, { quantity: n(x.target.value) })} /></td>
              <td className="pr-2"><input className="field !min-h-9 w-20" disabled={ro} value={s.unit} onChange={(x) => setScope(i, { unit: x.target.value })} /></td>
              <td className="pr-2"><select className="field !min-h-9" disabled={ro} value={s.source} onChange={(x) => setScope(i, { source: x.target.value as Scope["source"] })}><option value="customer_tape">Customer tape (unverified)</option><option value="staff_verified">Verified on site</option><option value="staff_entered">Staff entered</option></select></td>
              <td>{!ro && <button className="text-xs underline" onClick={() => setE({ ...e, scope: e.scope.filter((_, j) => j !== i) })}>Remove</button>}</td>
            </tr>
          ))}
        </tbody></table></div>
        {!ro && <button className="mt-2 text-sm underline" onClick={() => setE({ ...e, scope: [...e.scope, { id: rid(), description: "", quantity: null, unit: "", source: "staff_entered" }] })}>Add scope item</button>}
      </section>

      <section className="border border-line bg-white p-5">
        <h2 className="mb-1 font-semibold">Pricing lines (manual)</h2>
        <p className="mb-3 text-xs text-stone">Rates are never filled in automatically. Every line needs a quantity and a rate before a total exists. Price-book rates apply only when the owner has approved them.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm"><thead><tr className="text-left text-xs text-stone uppercase"><th>Category</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate ($)</th><th>From price book</th><th>Line</th><th /></tr></thead><tbody>
          {e.lines.map((l, i) => (
            <tr key={l.id} className="border-t border-bone-2">
              <td className="py-1.5 pr-2"><select className="field !min-h-9" disabled={ro} value={l.category} onChange={(x) => setLine(i, { category: x.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></td>
              <td className="pr-2"><input className="field !min-h-9" disabled={ro} value={l.description} onChange={(x) => setLine(i, { description: x.target.value })} /></td>
              <td className="pr-2"><input className="field !min-h-9 w-20" disabled={ro} inputMode="decimal" value={l.quantity ?? ""} onChange={(x) => setLine(i, { quantity: n(x.target.value) })} data-testid={`line-${i}-qty`} /></td>
              <td className="pr-2"><input className="field !min-h-9 w-16" disabled={ro} value={l.unit} onChange={(x) => setLine(i, { unit: x.target.value })} /></td>
              <td className="pr-2"><input className="field !min-h-9 w-24" disabled={ro} inputMode="decimal" value={l.rate ?? ""} placeholder="blank" onChange={(x) => setLine(i, { rate: n(x.target.value), rate_source: x.target.value ? "manual" : null })} data-testid={`line-${i}-rate`} /></td>
              <td className="pr-2"><select className="field !min-h-9" disabled={ro || !pricebook.length} value="" onChange={(x) => { const pb = pricebook.find((p) => p.id === x.target.value); if (pb) setLine(i, { rate: pb.rate, unit: pb.unit || l.unit, rate_source: "pricebook" }); }}><option value="">{pricebook.length ? "Apply…" : "Price book empty"}</option>{pricebook.map((p) => <option key={p.id} value={p.id}>{p.description} ({p.unit})</option>)}</select></td>
              <td className="pr-2 whitespace-nowrap">{l.quantity !== null && l.rate !== null ? usd(l.quantity * l.rate) : <span className="text-stone">—</span>}</td>
              <td>{!ro && <button className="text-xs underline" onClick={() => setE({ ...e, lines: e.lines.filter((_, j) => j !== i) })}>Remove</button>}</td>
            </tr>
          ))}
        </tbody></table></div>
        {!ro && <button className="mt-2 text-sm underline" onClick={() => setE({ ...e, lines: [...e.lines, { id: rid(), category: "labor", description: "", quantity: null, unit: "", rate: null, rate_source: null }] })} data-testid="add-line">Add line</button>}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="border border-line bg-white p-5">
          <h2 className="mb-3 font-semibold">Adjustments</h2>
          {([["minimum", "Job minimum ($)"], ["mobilization", "Mobilization ($)"], ["waste_pct", "Waste on materials (%)"], ["tax_pct", "Tax (%)"], ...(e.can_see_margin ? [["margin_pct", "Margin (%) · owner only"]] : [])] as [keyof Adj, string][]).map(([k, label]) => (
            <label key={k} className="mb-2 flex items-center justify-between gap-3 text-sm"><span>{label}</span><input className="field !min-h-9 w-32" disabled={ro} inputMode="decimal" placeholder="blank" value={e.adjustments[k] ?? ""} onChange={(x) => setE({ ...e, adjustments: { ...e.adjustments, [k]: n(x.target.value) } })} /></label>
          ))}
        </div>
        <div className="border border-line bg-white p-5" data-testid="estimate-calc">
          <h2 className="mb-3 font-semibold">Calculation (last saved)</h2>
          {e.calc.complete ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Lines</dt><dd>{usd(e.calc.line_sum)}</dd></div>
              <div className="flex justify-between"><dt>Waste</dt><dd>{usd(e.calc.waste)}</dd></div>
              <div className="flex justify-between"><dt>Mobilization</dt><dd>{usd(e.calc.mobilization)}</dd></div>
              {e.can_see_margin && <><div className="flex justify-between"><dt>Cost</dt><dd>{usd(e.calc.cost)}</dd></div><div className="flex justify-between"><dt>Margin</dt><dd>{usd(e.calc.margin_amount)}</dd></div></>}
              {e.calc.minimum_applied && <p className="text-xs text-stone">Job minimum applied.</p>}
              <div className="flex justify-between border-t border-line pt-1"><dt>Before tax</dt><dd>{usd(e.calc.before_tax)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{usd(e.calc.tax)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd data-testid="estimate-total">{usd(e.calc.total)}</dd></div>
            </dl>
          ) : <p className="text-sm text-stone" data-testid="estimate-incomplete">Incomplete: {e.calc.reason}. No total is produced until every line has a manual quantity and rate.</p>}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <label className="block border border-line bg-white p-5"><span className="font-semibold">Scope text for the proposal</span><textarea className="field mt-2 min-h-[140px]" disabled={ro} value={e.customer_scope_text} onChange={(x) => setE({ ...e, customer_scope_text: x.target.value })} /></label>
        <label className="block border border-line bg-white p-5"><span className="font-semibold">Exclusions</span><textarea className="field mt-2 min-h-[140px]" disabled={ro} value={e.exclusions} onChange={(x) => setE({ ...e, exclusions: x.target.value })} /></label>
        <label className="block border border-line bg-white p-5 md:col-span-2"><span className="font-semibold">Internal notes (never exported)</span><textarea className="field mt-2 min-h-[90px]" disabled={ro} value={e.notes_internal} onChange={(x) => setE({ ...e, notes_internal: x.target.value })} /></label>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-bone/95 py-3 backdrop-blur">
        {!ro && <button className="btn btn-char !min-h-10" disabled={busy} onClick={save} data-testid="estimate-save">Save draft</button>}
        {perms.approve && !closed && <button className="btn btn-outline !min-h-10" disabled={busy || e.status === "approved_internal"} onClick={async () => { if (await call(`/admin/api/p4/estimates/${e.id}/approve`, { method: "POST" }, "Approved internally (owner)")) reload(); }} data-testid="estimate-approve">Approve (owner)</button>}
        {perms.export && ["approved_internal", "exported"].includes(e.status) && <button className="btn btn-outline !min-h-10" disabled={busy} onClick={async () => { const j = await call(`/admin/api/p4/estimates/${e.id}/export`, { method: "POST" }, "Exported privately (DOCX + PDF)"); if (j) { setExports(j.exports); reload(); } }} data-testid="estimate-export">Export DOCX + PDF</button>}
        {perms.markSent && e.status === "exported" && <button className="btn btn-outline !min-h-10" disabled={busy} onClick={async () => { const ch = window.prompt("How did you deliver it? (email, in_person, mail, portal, other)", "email"); if (ch && await call(`/admin/api/p4/estimates/${e.id}/mark-sent`, { method: "POST", body: JSON.stringify({ channel: ch }) }, "Recorded as sent by you")) reload(); }}>Record that I sent it</button>}
        <span className="text-xs text-stone">Status: <b>{e.status}</b> · v{e.version}{e.approved_by ? ` · approved by ${e.approved_by}` : ""}</span>
        {exportsOut.map((x) => <a key={x.id} href={x.href} className="text-sm font-semibold underline" data-testid={`download-${x.format}`}>{x.file_name}</a>)}
      </div>
    </div>
  );
}
