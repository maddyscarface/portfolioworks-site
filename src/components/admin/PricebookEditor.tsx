"use client";
import { useState } from "react";

type Item = { id?: string; category: string; description: string; unit: string; rate: number | null; approved: boolean };
const CATS = ["labor", "trades", "materials", "cleaning", "flooring", "fixtures", "disposal", "mobilization", "access", "schedule_contingency", "other"];

export function PricebookEditor({ initial, canWrite }: { initial: Item[]; canWrite: boolean }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [msg, setMsg] = useState("");
  const set = (i: number, p: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-xs text-stone uppercase"><th>Category</th><th>Description</th><th>Unit</th><th>Rate ($)</th><th>Owner approved</th><th /></tr></thead><tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-t border-bone-2">
            <td className="py-1.5 pr-2"><select className="field !min-h-9" disabled={!canWrite} value={it.category} onChange={(e) => set(i, { category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></td>
            <td className="pr-2"><input className="field !min-h-9" disabled={!canWrite} value={it.description} onChange={(e) => set(i, { description: e.target.value })} /></td>
            <td className="pr-2"><input className="field !min-h-9 w-20" disabled={!canWrite} value={it.unit} onChange={(e) => set(i, { unit: e.target.value })} /></td>
            <td className="pr-2"><input className="field !min-h-9 w-28" disabled={!canWrite} inputMode="decimal" placeholder="blank" value={it.rate ?? ""} onChange={(e) => set(i, { rate: e.target.value.trim() === "" ? null : Number(e.target.value) })} /></td>
            <td className="pr-2"><input type="checkbox" disabled={!canWrite} checked={it.approved} onChange={(e) => set(i, { approved: e.target.checked })} /></td>
            <td>{canWrite && <button className="text-xs underline" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>}</td>
          </tr>
        ))}
      </tbody></table></div>
      {!items.length && <p className="text-sm text-stone">The price book is empty (it ships blank by design). Only the owner can add rates.</p>}
      {canWrite && (
        <div className="flex gap-3">
          <button className="btn btn-outline !min-h-9 !text-sm" onClick={() => setItems([...items, { category: "materials", description: "", unit: "", rate: null, approved: false }])}>Add item</button>
          <button className="btn btn-char !min-h-9 !text-sm" onClick={async () => {
            setMsg("");
            const r = await fetch("/admin/api/p4/pricebook", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j.ok) { setItems(j.items); setMsg("Saved"); } else setMsg(j.error ?? "Failed");
          }}>Save price book</button>
          {msg && <span className="self-center text-sm">{msg}</span>}
        </div>
      )}
    </div>
  );
}
