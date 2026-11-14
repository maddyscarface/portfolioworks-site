"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SuppressionForm() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [reason, setReason] = useState("customer opt-out"); const [msg, setMsg] = useState("");
  return (
    <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      const r = await fetch("/admin/api/p4/suppressions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, reason }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setEmail(""); setMsg("Added"); router.refresh(); } else setMsg(j.error ?? "Failed");
    }}>
      <input className="field max-w-xs" type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
      <input className="field max-w-xs" required value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
      <button className="btn btn-char !min-h-12">Suppress</button>{msg && <span className="self-center text-sm">{msg}</span>}
    </form>
  );
}
