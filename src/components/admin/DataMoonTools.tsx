"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MockRun({ recipes }: { recipes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [rid, setRid] = useState(recipes[0]?.id ?? "");
  const [scenario, setScenario] = useState("ok");
  const [out, setOut] = useState<{ steps?: { step: string; ok: boolean; detail: string }[]; error?: string } | null>(null);
  return (
    <div className="space-y-3" data-testid="dm-mock">
      <div className="flex flex-wrap gap-2">
        <select className="field max-w-sm" value={rid} onChange={(e) => setRid(e.target.value)} aria-label="Recipe">{recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select className="field max-w-[220px]" value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Scenario">{["ok", "401", "422", "429", "credits_exhausted", "expired_export", "building"].map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn btn-char !min-h-12" data-testid="dm-mock-run" onClick={async () => {
          setOut(null);
          const r = await fetch("/admin/api/p4/datamoon/mock-run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipe_id: rid, scenario }) });
          const j = await r.json().catch(() => ({}));
          setOut(r.ok ? j : { error: j.error ?? `Failed (${r.status})` }); router.refresh();
        }}>Run synthetic pipeline</button>
      </div>
      {out?.error && <p className="err">{out.error}</p>}
      {out?.steps && <ol className="space-y-1 text-sm">{out.steps.map((s, i) => <li key={i}><b className={s.ok ? "text-[#1f5130]" : "text-[#8a1f14]"}>{s.ok ? "✓" : "✗"}</b> {s.step}: <span className="text-stone">{s.detail}</span></li>)}</ol>}
    </div>
  );
}

export function TopicSearch() {
  const [q, setQ] = useState("apartment turnover"); const [kind, setKind] = useState("b2c");
  const [out, setOut] = useState<{ topics?: string[]; synthetic?: boolean; note?: string; error?: string } | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Keywords" />
        <select className="field max-w-[110px]" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option>b2c</option><option>b2b</option></select>
        <button className="btn btn-outline !min-h-12" onClick={async () => { const r = await fetch(`/admin/api/p4/datamoon/topics?kind=${kind}&q=${encodeURIComponent(q)}`); setOut(await r.json().catch(() => ({ error: "failed" }))); }}>Discover topics</button>
      </div>
      {out && <div className="text-sm">{out.error ? <p className="err">{out.error}</p> : <><p className="text-xs text-stone">{out.synthetic ? out.note : "Live topic search (free endpoint)"}</p><ul className="mt-1 list-disc pl-5">{out.topics?.map((t) => <li key={t}>{t}</li>)}</ul></>}</div>}
    </div>
  );
}
