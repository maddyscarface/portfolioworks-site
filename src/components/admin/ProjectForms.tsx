"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewProjectForm({ services }: { services: { id: string; label: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ service: services[0]?.id ?? "", first_name: "", last_name: "", email: "", town: "" });
  const [msg, setMsg] = useState("");
  return (
    <form className="grid gap-3 sm:grid-cols-6" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      const r = await fetch("/admin/api/p4/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, last_name: v.last_name || undefined, town: v.town || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) router.push(`/admin/projects/${j.id}`); else setMsg(j.error ?? "Failed");
    }}>
      <select className="field sm:col-span-2" value={v.service} onChange={(e) => setV({ ...v, service: e.target.value })} aria-label="Service">{services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      <input className="field" placeholder="First name" value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
      <input className="field" placeholder="Last name" value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
      <input className="field" type="email" required placeholder="Email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      <input className="field" placeholder="Town" value={v.town} onChange={(e) => setV({ ...v, town: e.target.value })} />
      <button className="btn btn-char sm:col-span-2">Create project</button>
      {msg && <p className="err sm:col-span-4">{msg}</p>}
    </form>
  );
}

export function InvitePanel({ projectId, steps }: { projectId: string; steps: { id: string; title: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"initial" | "followup">("initial");
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [link, setLink] = useState<{ url: string; expires_at: string } | null>(null);
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-3" data-testid="invite-panel">
      <div className="flex gap-2">
        {(["initial", "followup"] as const).map((k) => <button key={k} type="button" className={`choice !min-h-9 !py-1 text-sm`} aria-pressed={kind === k} onClick={() => setKind(k)}>{k === "initial" ? "New walkthrough link" : "Request specific items"}</button>)}
      </div>
      {kind === "followup" && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {steps.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{s.title}</label>)}
          <textarea className="field sm:col-span-2" maxLength={500} placeholder="Note to the customer (shown on their link)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
      <button type="button" className="btn btn-char !min-h-10 !text-sm" data-testid="create-link" onClick={async () => {
        setMsg(""); setLink(null);
        const r = await fetch(`/admin/api/p4/projects/${projectId}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, requested_steps: kind === "followup" ? sel : undefined, note: note || undefined }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) { setLink({ url: j.url, expires_at: j.expires_at }); router.refresh(); } else setMsg(j.error ?? "Failed");
      }}>Create link</button>
      {msg && <p className="err">{msg}</p>}
      {link && (
        <div className="border border-copper bg-cedar-soft p-3 text-sm" data-testid="invite-link">
          <p className="font-semibold">Copy this link now. It is shown once and is not emailed by the site.</p>
          <div className="mt-2 flex gap-2"><input readOnly className="field !min-h-9 font-mono text-xs" value={link.url} onFocus={(e) => e.target.select()} /><button type="button" className="btn btn-outline !min-h-9 !px-3 !text-sm" onClick={() => navigator.clipboard?.writeText(link.url)}>Copy</button></div>
          <p className="mt-1 text-xs text-stone">Expires {new Date(link.expires_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
