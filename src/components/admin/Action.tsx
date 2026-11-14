"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Small JSON action button for admin pages. Shows the server's error text; refreshes the page on success. */
export function Action({ url, method = "POST", body, label, confirm, className = "btn btn-outline !min-h-9 !px-3 !text-sm", onResult, testId }: { url: string; method?: string; body?: unknown; label: string; confirm?: string; className?: string; onResult?: (j: Record<string, unknown>) => void; testId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={busy} data-testid={testId} onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true); setMsg("");
        const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
        const j = await r.json().catch(() => ({ ok: r.ok }));
        setBusy(false);
        if (!r.ok || j.ok === false) setMsg(j.error ?? `Failed (${r.status})`);
        else { onResult?.(j); router.refresh(); }
      }}>{busy ? "Working…" : label}</button>
      {msg && <span className="max-w-xs text-xs text-[#a3261b]" role="alert">{msg}</span>}
    </span>
  );
}
