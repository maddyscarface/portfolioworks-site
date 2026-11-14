"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, FileText, Film, ImagePlus, Lock, RotateCcw, ShieldAlert, Trash2, Ruler, UserX } from "./icons";
import { privacyGate } from "@/lib/walkthrough/privacy";
import { parseLength, parseCount, rectanglesAreaSqFt } from "@/lib/walkthrough/units";
import { api, uploadToStep } from "./upload-client";

type MeasureField = { id: string; label: string; type: "length" | "count"; hint: string; required: boolean };
type Step =
  | { id: string; kind: "photo" | "video"; title: string; prompt: string; tip?: string; safety?: string; required: boolean; max: number }
  | { id: string; kind: "document"; title: string; prompt: string; tip?: string; safety?: string; required: boolean; max: number }
  | { id: string; kind: "date"; title: string; prompt: string; required: boolean }
  | { id: string; kind: "footprint"; title: string; prompt: string; tip?: string; required: boolean }
  | { id: string; kind: "measure"; title: string; prompt: string; tip?: string; fields: MeasureField[] }
  | { id: string; kind: "choice"; title: string; prompt: string; multi: boolean; choices: { id: string; label: string }[]; required: boolean }
  | { id: string; kind: "text"; title: string; prompt: string; required: boolean };
type Media = { id: string; step_id: string; kind: string; name: string; uploaded_at: string };
type Progress = { answers: Record<string, string | string[]>; footprint: { label: string; unit?: string; width: string; length: string; unknown?: boolean }[]; measures: Record<string, { raw: string; unknown?: boolean }>; assist_requested?: boolean; correction_note?: string };
export type PublicState = {
  ok: boolean; kind: string; status: string; status_label: string; service: string; service_label: string; multi_unit?: boolean; intro: string; first_name: string | null;
  steps: Step[]; note: string | null; media: Media[]; editable: boolean; can_correct: boolean; submitted_at: string | null; expires_at: string; upload_mode: string; progress: Progress | null;
};
type MediaStepT = Extract<Step, { kind: "photo" | "video" | "document" }>;
type QueueItem = { key: string; stepId: string; file: File; name: string; progress: number; status: "uploading" | "error"; error?: string; preview?: string };

const EMPTY: Progress = { answers: {}, footprint: [], measures: {} };
const skipKey = (id: string) => `${id}__skip`;

export function WalkthroughApp({ token, initial }: { token: string; initial: PublicState }) {
  const [st, setSt] = useState(initial);
  const [p, setP] = useState<Progress>(() => ({ ...EMPTY, ...(initial.progress ?? {}) }));
  const resumeAt = Number((initial.progress?.answers?.__step as string) ?? 0);
  const [screen, setScreen] = useState<"intro" | "review" | "done" | "correct" | number>(initial.status === "submitted" ? "done" : initial.progress ? Math.min(resumeAt, initial.steps.length - 1) : "intro");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/api/w/${encodeURIComponent(token)}`;
  const dirty = useRef(false);
  const steps = st.steps;
  const idx = typeof screen === "number" ? screen : -1;
  const step = idx >= 0 ? steps[idx] : null;

  // Autosave (debounced) + local backup so a dropped connection or closed tab never loses answers.
  useEffect(() => {
    if (!dirty.current || !st.editable) return;
    try { localStorage.setItem(`wt:${token.slice(0, 10)}`, JSON.stringify(p)); } catch {}
    setSave("saving");
    const t = setTimeout(async () => {
      const r = await api(`${base}/progress`, { method: "PUT", body: JSON.stringify(p) }).catch(() => ({ ok: false }));
      setSave(r.ok ? "saved" : "offline");
    }, 700);
    return () => clearTimeout(t);
  }, [p, base, st.editable, token]);
  useEffect(() => {
    const on = () => { if (save === "offline") { dirty.current = true; setP((x) => ({ ...x })); } };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [save]);

  const update = useCallback((fn: (x: Progress) => Progress) => { dirty.current = true; setP((x) => fn(x)); }, []);
  const go = (n: number | "review" | "intro") => {
    setErr("");
    if (typeof n === "number") update((x) => ({ ...x, answers: { ...x.answers, __step: String(n) } }));
    setScreen(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const refresh = async () => { const s = await api<PublicState>(`${base}/state`); if (s.ok) setSt((o) => ({ ...s, progress: o.progress })); };

  const mediaFor = (id: string) => st.media.filter((m) => m.step_id === id);
  const stepState = (s: Step): "done" | "skipped" | "missing" | "optional" => {
    if (p.answers[skipKey(s.id)] === "1") return "skipped";
    if (s.kind === "photo" || s.kind === "video" || s.kind === "document") return mediaFor(s.id).length ? "done" : s.required ? "missing" : "optional";
    if (s.kind === "footprint") return p.footprint.some((r) => r.unknown || (parseLength(r.width) && parseLength(r.length))) ? "done" : s.required ? "missing" : "optional";
    if (s.kind === "measure") { const req = s.fields.filter((f) => f.required); const ok = req.every((f) => p.measures[f.id]?.unknown || (p.measures[f.id]?.raw ?? "").trim()); const any = s.fields.some((f) => (p.measures[f.id]?.raw ?? "").trim() || p.measures[f.id]?.unknown); return ok && (any || !req.length) ? (any ? "done" : "optional") : "missing"; }
    const a = p.answers[s.id];
    const has = Array.isArray(a) ? a.length > 0 : Boolean(a && String(a).trim());
    return has ? "done" : s.required ? "missing" : "optional";
  };
  const missing = steps.filter((s) => stepState(s) === "missing");

  // Tenant privacy: mirror of the server gate. Uploads stay locked until occupancy + all three promises are given.
  const gate = privacyGate(p.answers);
  async function addFiles(s: Step, files: FileList | null) {
    if (!files?.length || (s.kind !== "photo" && s.kind !== "video" && s.kind !== "document")) return;
    if (!gate.ok) { setErr(gate.message); return; }
    const room = s.max - mediaFor(s.id).length - queue.filter((q) => q.stepId === s.id).length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (!list.length) { setErr(`This step takes up to ${s.max}. Remove one first.`); return; }
    // The server checks the SAVED answers, so flush the draft before the first upload.
    if (dirty.current) { const sv = await api(`${base}/progress`, { method: "PUT", body: JSON.stringify(p) }).catch(() => ({ ok: false })); if (!sv.ok) { setErr("Couldn't save your answers yet. Check your connection and try again."); return; } }
    for (const file of list) startUpload(s.id, file);
  }
  function startUpload(stepId: string, file: File, key = `${Date.now()}-${Math.random()}`) {
    const preview = file.type.startsWith("image/") && !/heic|heif/i.test(file.type) ? URL.createObjectURL(file) : undefined;
    setQueue((q) => [...q.filter((x) => x.key !== key), { key, stepId, file, name: file.name, progress: 0, status: "uploading", preview }]);
    uploadToStep(token, stepId, file, (f) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, progress: f } : x))))
      .then(async () => { setQueue((q) => q.filter((x) => x.key !== key)); await refresh(); update((x) => { const a = { ...x.answers }; delete a[skipKey(stepId)]; return { ...x, answers: a }; }); })
      .catch((e: Error) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, status: "error", error: e.message } : x))));
  }
  async function removeMedia(id: string) {
    const r = await api(`${base}/media/${id}`, { method: "DELETE" });
    if (r.ok) await refresh(); else setErr(r.error ?? "Couldn't remove that file");
  }

  async function submit() {
    if (missing.length) { setErr(`A few required steps are still open: ${missing.map((m) => m.title).join(", ")}. Complete them or tap “I can't do this step”.`); return; }
    if (queue.some((q) => q.status === "uploading")) { setErr("Please wait for uploads to finish."); return; }
    setBusy(true); setErr("");
    const saved = await api(`${base}/progress`, { method: "PUT", body: JSON.stringify(p) });
    const r = saved.ok ? await api(`${base}/submit`, { method: "POST" }) : saved;
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Couldn't submit. Your answers are saved; please try again."); return; }
    try { localStorage.removeItem(`wt:${token.slice(0, 10)}`); } catch {}
    await refresh();
    setSt((o) => ({ ...o, status: "submitted", editable: false, can_correct: true, submitted_at: new Date().toISOString() }));
    setScreen("done");
    window.scrollTo({ top: 0 });
  }

  const total = steps.length;
  const pct = idx >= 0 ? Math.round(((idx + 1) / total) * 100) : screen === "review" || screen === "done" ? 100 : 0;

  return (
    <div className="min-h-[100svh] bg-bone pb-28" data-testid="walkthrough-app">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0"><p className="truncate font-display text-[17px] text-char">PortfolioWorks walkthrough</p><p className="truncate text-xs text-stone">{st.service_label}{st.kind === "followup" ? " · follow-up" : ""}</p></div>
          <p className="shrink-0 text-xs text-stone" aria-live="polite" data-testid="save-status">{save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "offline" ? "Offline, will retry" : ""}</p>
        </div>
        <div className="h-1 bg-bone-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className="h-1 bg-copper transition-all" style={{ width: `${pct}%` }} /></div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-6">
        {screen === "intro" && (
          <section className="space-y-5" data-testid="wt-intro">
            <h1 className="font-display text-[30px] leading-tight text-char">{st.first_name ? `Hi ${st.first_name}, let's` : "Let's"} look at the property.</h1>
            <p className="text-[16px] text-char/85">{st.intro}</p>
            {st.note && <p className="border-l-4 border-copper bg-white p-4 text-[15px]"><b>From our estimator:</b> {st.note}</p>}
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-3"><Camera className="mt-0.5 shrink-0 text-cedar" size={20} />{total} short steps: access and timing, room measurements, photos of the work and optional floor plans.</li>
              <li className="flex gap-3"><RotateCcw className="mt-0.5 shrink-0 text-cedar" size={20} />Progress saves automatically. Bookmark this page to finish later.</li>
              <li className="flex gap-3"><UserX className="mt-0.5 shrink-0 text-cedar" size={20} />Resident privacy: photograph the work, never people, mail, IDs, screens or personal belongings. If a unit is occupied, the resident must be told first.</li>
              <li className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-cedar" size={20} />Stay safe: no ladders, roofs or crawlspaces for a photo. Skip any step you can&rsquo;t do safely.</li>
              <li className="flex gap-3"><Lock className="mt-0.5 shrink-0 text-cedar" size={20} />Private link. Files are seen only by PortfolioWorks staff, are never used for advertising or AI, and can be deleted on request. No prices are shown here; any price comes in a written proposal.</li>
            </ul>
            <button className="btn btn-cedar w-full" onClick={() => go(0)} data-testid="wt-begin">Begin</button>
          </section>
        )}

        {step && (
          <section key={step.id} data-testid={`wt-step-${step.id}`}>
            <p className="text-xs font-semibold tracking-wide text-stone uppercase">Step {idx + 1} of {total}{"required" in step && step.required ? "" : " · optional"}</p>
            <h1 className="mt-1 font-display text-[26px] leading-tight text-char">{step.title}</h1>
            <p className="mt-2 text-[16px] text-char/85">{step.prompt}</p>
            {"safety" in step && step.safety && <p className="mt-3 flex gap-2 rounded-[2px] bg-cedar-soft p-3 text-[14px] text-char"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-cedar" />{step.safety}</p>}
            {"tip" in step && step.tip && <p className="mt-3 text-[13.5px] text-stone">{step.tip}</p>}

            <div className="mt-5">
              {(step.kind === "photo" || step.kind === "video" || step.kind === "document") && !gate.ok && (
                <p className="mb-3 flex gap-2 border border-bronze bg-bronze-soft p-3 text-[14px] text-ink" data-testid="privacy-locked"><Lock size={18} className="mt-0.5 shrink-0" />{gate.message}{gate.reason !== "resident_not_notified" && <> <button type="button" className="font-semibold underline" onClick={() => go(Math.max(0, steps.findIndex((x) => x.id === (gate.reason === "occupancy_missing" ? "occupancy" : "privacy"))))}>Go to that step</button></>}</p>
              )}
              {(step.kind === "photo" || step.kind === "video" || step.kind === "document") && (
                <MediaStep step={step} locked={!gate.ok} media={mediaFor(step.id)} queue={queue.filter((q) => q.stepId === step.id)} onFiles={(f) => addFiles(step, f)} onRemove={removeMedia}
                  onRetry={(q) => startUpload(q.stepId, q.file, q.key)} onDismiss={(k) => setQueue((qs) => qs.filter((x) => x.key !== k))} />
              )}
              {step.kind === "date" && (
                <input type="date" className="field text-[16px]" aria-label={step.title} value={String(p.answers[step.id] ?? "")} onChange={(e) => update((x) => ({ ...x, answers: { ...x.answers, [step.id]: e.target.value } }))} data-testid={`date-${step.id}`} />
              )}
              {step.kind === "footprint" && <Footprint multi={Boolean(st.multi_unit)} value={p.footprint} onChange={(f) => update((x) => ({ ...x, footprint: f }))} />}
              {step.kind === "measure" && (
                <div className="space-y-4">
                  {step.fields.map((f) => <MeasureInput key={f.id} f={f} v={p.measures[f.id]} onChange={(v) => update((x) => ({ ...x, measures: { ...x.measures, [f.id]: v } }))} />)}
                </div>
              )}
              {step.kind === "choice" && (
                <div className="grid gap-2" role={step.multi ? "group" : "radiogroup"} aria-label={step.title}>
                  {step.choices.map((c) => {
                    const cur = p.answers[step.id];
                    const on = Array.isArray(cur) ? cur.includes(c.id) : cur === c.id;
                    return <button key={c.id} type="button" className="choice !min-h-[52px] text-[15px]" role={step.multi ? "checkbox" : "radio"} aria-checked={on} data-testid={`choice-${step.id}-${c.id}`}
                      onClick={() => update((x) => { const a = x.answers[step.id]; const arr = Array.isArray(a) ? a : a ? [String(a)] : []; return { ...x, answers: { ...x.answers, [step.id]: step.multi ? (on ? arr.filter((y) => y !== c.id) : [...arr.filter((y) => !(c.id === "none" || y === "none")), c.id]) : [c.id] } }; })}>{c.label}</button>;
                  })}
                </div>
              )}
              {step.kind === "text" && (
                <textarea className="field min-h-[160px] text-[16px]" maxLength={3000} aria-label={step.title} value={String(p.answers[step.id] ?? "")} onChange={(e) => update((x) => ({ ...x, answers: { ...x.answers, [step.id]: e.target.value } }))} data-testid={`text-${step.id}`} />
              )}
            </div>

            {(step.kind === "photo" || step.kind === "video" || step.kind === "document" || step.kind === "footprint" || step.kind === "measure") && stepState(step) !== "done" && (
              <label className="mt-5 flex items-start gap-3 text-[14px] text-char/80">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-[#172637]" checked={p.answers[skipKey(step.id)] === "1"} onChange={(e) => update((x) => ({ ...x, answers: { ...x.answers, [skipKey(step.id)]: e.target.checked ? "1" : "" }, assist_requested: e.target.checked ? true : x.assist_requested }))} data-testid={`skip-${step.id}`} />
                <span>I can&rsquo;t do this step safely or right now. <span className="text-stone">We&rsquo;ll cover it on a call or visit.</span></span>
              </label>
            )}
            {err && <p className="err mt-4" role="alert">{err}</p>}
          </section>
        )}

        {screen === "review" && (
          <section className="space-y-5" data-testid="wt-review">
            <h1 className="font-display text-[28px] text-char">Review and send</h1>
            <p className="text-[15px] text-char/80">Tap any step to change it. Nothing is final until you send.</p>
            <ol className="divide-y divide-line border border-line bg-white">
              {steps.map((s, i) => { const state = stepState(s); return (
                <li key={s.id}><button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => go(i)}>
                  <span className="min-w-0"><span className="block truncate font-semibold text-char">{s.title}</span><span className="text-xs text-stone">{summary(s, p, mediaFor(s.id).length)}</span></span>
                  <span className={`shrink-0 text-xs font-semibold ${state === "missing" ? "text-[#a3261b]" : state === "done" ? "text-cedar" : "text-stone"}`}>{state === "done" ? "Done" : state === "missing" ? "Needed" : state === "skipped" ? "Skipped" : "Optional"}</span>
                </button></li>
              ); })}
            </ol>
            <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#172637]" checked={Boolean(p.assist_requested)} onChange={(e) => update((x) => ({ ...x, assist_requested: e.target.checked }))} /><span>I&rsquo;d also like a live video call or a site visit.</span></label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn btn-cedar w-full" disabled={busy} onClick={submit} data-testid="wt-submit">{busy ? "Sending…" : "Send my walkthrough"}</button>
            <p className="text-xs text-stone">You can still add a correction after sending.</p>
          </section>
        )}

        {screen === "done" && (
          <section className="space-y-5" data-testid="wt-done">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cedar text-white"><Check size={30} /></div>
            <h1 className="font-display text-[30px] leading-tight text-char">Thanks{st.first_name ? `, ${st.first_name}` : ""}. Your walkthrough is in.</h1>
            <p className="text-[16px] text-char/85">{st.status_label}</p>
            <div className="border border-line bg-white p-5 text-[15px]">
              <p className="font-semibold text-char">What happens next</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-char/85">
                <li>Our estimator reviews your photos and measurements.</li>
                <li>We contact you by email about next steps, often a short site visit to confirm measurements.</li>
                <li>Any price comes only in a written proposal.</li>
              </ol>
              {st.submitted_at && <p className="mt-3 text-xs text-stone">Received {new Date(st.submitted_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>}
            </div>
            {st.can_correct && <button className="btn btn-outline w-full" onClick={() => setScreen("correct")} data-testid="wt-correct-open">Add a correction or more photos</button>}
          </section>
        )}

        {screen === "correct" && <Correction base={base} steps={steps} media={st.media} queue={queue} onFiles={(s, f) => addFiles(s, f)} onRetry={(q) => startUpload(q.stepId, q.file, q.key)} onDone={() => setScreen("done")} />}
      </main>

      {(step || screen === "review") && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur" aria-label="Walkthrough navigation">
          <div className="mx-auto flex max-w-xl gap-3 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button className="btn btn-outline flex-1 !px-3" onClick={() => (screen === "review" ? go(total - 1) : idx > 0 ? go(idx - 1) : go("intro"))} data-testid="wt-back"><ChevronLeft size={18} />Back</button>
            {step && <button className="btn btn-cedar flex-[1.4] !px-3" data-testid="wt-next" onClick={() => {
              if (stepState(step) === "missing") { setErr("This step is needed. Add it, or tick “I can't do this step”."); return; }
              if (idx < total - 1) go(idx + 1); else go("review");
            }}>{idx < total - 1 ? "Next" : "Review"}<ChevronRight size={18} /></button>}
          </div>
        </nav>
      )}
    </div>
  );
}

function summary(s: Step, p: Progress, mediaCount: number) {
  if (p.answers[skipKey(s.id)] === "1") return "We'll cover this on a call or visit";
  if (s.kind === "photo" || s.kind === "video") return mediaCount ? `${mediaCount} ${s.kind === "video" ? "video" : mediaCount > 1 ? "photos" : "photo"}` : "None yet";
  if (s.kind === "document") return mediaCount ? `${mediaCount} file${mediaCount > 1 ? "s" : ""}` : "None";
  if (s.kind === "footprint") { const r = p.footprint.map((x) => [parseLength(x.width), parseLength(x.length)]).filter(([a, b]) => a && b) as [NonNullable<ReturnType<typeof parseLength>>, NonNullable<ReturnType<typeof parseLength>>][]; return r.length ? r.map(([a, b]) => `${a.display} × ${b.display}`).join(", ") : p.footprint.some((x) => x.unknown) ? "Unknown" : "Not measured"; }
  if (s.kind === "measure") return s.fields.map((f) => { const m = p.measures[f.id]; return m?.unknown ? `${f.label}: unknown` : m?.raw ? `${f.label}: ${m.raw}` : null; }).filter(Boolean).join(" · ") || "Not measured";
  const a = p.answers[s.id];
  if (s.kind === "choice") { const ids = Array.isArray(a) ? a : a ? [a] : []; return ids.map((id) => s.choices.find((c) => c.id === id)?.label).filter(Boolean).join(", ") || "Not answered"; }
  return a ? String(a).slice(0, 80) : "Not answered";
}

function MediaStep({ step, media, queue, onFiles, onRemove, onRetry, onDismiss, locked = false }: { step: MediaStepT; locked?: boolean; media: Media[]; queue: QueueItem[]; onFiles: (f: FileList | null) => void; onRemove: (id: string) => void; onRetry: (q: QueueItem) => void; onDismiss: (k: string) => void }) {
  const cam = useRef<HTMLInputElement>(null); const lib = useRef<HTMLInputElement>(null);
  const accept = step.kind === "video" ? "video/mp4,video/quicktime,video/webm" : step.kind === "document" ? "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" : "image/jpeg,image/png,image/webp,image/heic,image/heif";
  const full = locked || media.length + queue.length >= step.max;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-cedar !min-h-[56px]" disabled={full} onClick={() => cam.current?.click()} data-testid={`cam-${step.id}`}>{step.kind === "video" ? <Film size={20} /> : step.kind === "document" ? <FileText size={20} /> : <Camera size={20} />}{step.kind === "video" ? "Record" : step.kind === "document" ? "Photo of plan" : "Take photo"}</button>
        <button type="button" className="btn btn-outline !min-h-[56px]" disabled={full} onClick={() => lib.current?.click()}><ImagePlus size={20} />Choose</button>
      </div>
      <input ref={cam} disabled={locked} type="file" accept={accept} capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <input ref={lib} disabled={locked} type="file" accept={accept} multiple={step.max > 1} className="sr-only" data-testid={`file-${step.id}`} aria-label={`Choose ${step.kind === "video" ? "a video" : step.kind === "document" ? "a PDF or image" : "photos"} for ${step.title}`} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <p className="text-xs text-stone">{media.length} of {step.max} added{step.kind === "video" ? " · up to 300 MB" : step.kind === "document" ? " · PDF up to 20 MB" : ""}</p>
      <ul className="space-y-2">
        {media.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 border border-line bg-white px-3 py-2.5 text-[14px]" data-testid="media-item">
            <span className="flex min-w-0 items-center gap-2"><Check size={16} className="shrink-0 text-cedar" /><span className="truncate">{m.name}</span></span>
            <button type="button" className="shrink-0 p-2 text-stone" aria-label={`Remove ${m.name}`} onClick={() => onRemove(m.id)}><Trash2 size={18} /></button>
          </li>
        ))}
        {queue.map((q) => (
          <li key={q.key} className="border border-line bg-white px-3 py-2.5 text-[14px]" data-testid="upload-item">
            <div className="flex items-center justify-between gap-3"><span className="truncate">{q.name}</span>
              {q.status === "uploading" ? <span className="shrink-0 text-xs text-stone">{Math.round(q.progress * 100)}%</span>
                : <span className="flex shrink-0 gap-2"><button type="button" className="text-xs font-semibold underline" onClick={() => onRetry(q)}>Retry</button><button type="button" className="text-xs text-stone underline" onClick={() => onDismiss(q.key)}>Remove</button></span>}
            </div>
            {q.status === "uploading" ? <div className="mt-2 h-1.5 bg-bone-2"><div className="h-1.5 bg-copper transition-all" style={{ width: `${Math.max(4, q.progress * 100)}%` }} /></div> : <p className="err">{q.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MeasureInput({ f, v, onChange }: { f: MeasureField; v?: { raw: string; unknown?: boolean }; onChange: (v: { raw: string; unknown?: boolean }) => void }) {
  const raw = v?.raw ?? "";
  const parsed = f.type === "length" ? parseLength(raw) : null;
  const count = f.type === "count" ? parseCount(raw) : null;
  const bad = raw.trim() && !v?.unknown && (f.type === "length" ? !parsed : count === null);
  return (
    <div>
      <label className="label" htmlFor={`m-${f.id}`}>{f.label}{f.required ? " *" : ""}</label>
      <div className="flex items-center gap-2">
        <input id={`m-${f.id}`} className="field text-[16px]" inputMode={f.type === "count" ? "numeric" : "text"} placeholder={f.hint} disabled={v?.unknown} value={raw} onChange={(e) => onChange({ raw: e.target.value.slice(0, 30), unknown: false })} data-testid={`measure-${f.id}`} />
        <Ruler size={20} className="shrink-0 text-stone" aria-hidden />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={bad ? "text-[#a3261b]" : "text-stone"}>{bad ? "Try a format like 12' 6\", 150 in or 3.8 m" : parsed ? `Reads as ${parsed.display}${parsed.assumed_unit ? " (we assumed feet)" : ""}` : count !== null && raw ? `${count}` : f.hint}</span>
        <label className="flex items-center gap-1.5"><input type="checkbox" className="h-4 w-4" checked={Boolean(v?.unknown)} onChange={(e) => onChange({ raw: e.target.checked ? "" : raw, unknown: e.target.checked })} />I don&rsquo;t know</label>
      </div>
    </div>
  );
}

function Footprint({ value, onChange, multi = false }: { value: Progress["footprint"]; onChange: (v: Progress["footprint"]) => void; multi?: boolean }) {
  const rows = value.length ? value : [{ label: "Room 1", unit: multi ? "" : undefined, width: "", length: "" }];
  const set = (i: number, patch: Partial<Progress["footprint"][number]>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const measured = rows.map((r) => [parseLength(r.width), parseLength(r.length)] as const).filter(([a, b]) => a && b).map(([a, b]) => ({ width_in: a!.inches, length_in: b!.inches }));
  return (
    <div className="space-y-4">
      {rows.map((r, i) => {
        const w = parseLength(r.width); const l = parseLength(r.length);
        return (
          <fieldset key={i} className="border border-line bg-white p-4" data-testid={`rect-${i}`}>
            <legend className="px-1 text-sm font-semibold">{multi && r.unit ? `${r.unit} · ` : ""}{r.label || `Room ${i + 1}`}</legend>
            <div className="mb-3 grid grid-cols-2 gap-3">
              {multi && <label className="block"><span className="label">Unit</span><input className="field text-[16px]" placeholder="e.g. 2B" value={r.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value.slice(0, 20) })} data-testid={`rect-${i}-unit`} /></label>}
              <label className={`block ${multi ? "" : "col-span-2"}`}><span className="label">Room</span><input className="field text-[16px]" placeholder="e.g. Bedroom 1" value={r.label} onChange={(e) => set(i, { label: e.target.value.slice(0, 40) })} data-testid={`rect-${i}-label`} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">Width</span><input className="field text-[16px]" placeholder={`e.g. 12' 6"`} disabled={r.unknown} value={r.width} onChange={(e) => set(i, { width: e.target.value.slice(0, 30), unknown: false })} data-testid={`rect-${i}-w`} /></label>
              <label className="block"><span className="label">Length</span><input className="field text-[16px]" placeholder="e.g. 16'" disabled={r.unknown} value={r.length} onChange={(e) => set(i, { length: e.target.value.slice(0, 30), unknown: false })} data-testid={`rect-${i}-l`} /></label>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone">
              <span>{w && l ? `${w.display} × ${l.display}${w.assumed_unit || l.assumed_unit ? " (we assumed feet)" : ""}` : (r.width || r.length) && !r.unknown ? "Try 12' 6\", 150 in or 3.8 m" : "Rough is fine"}</span>
              <span className="flex gap-3"><label className="flex items-center gap-1.5"><input type="checkbox" className="h-4 w-4" checked={Boolean(r.unknown)} onChange={(e) => set(i, { unknown: e.target.checked, width: "", length: "" })} />Don&rsquo;t know</label>
                {rows.length > 1 && <button type="button" className="underline" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>}</span>
            </div>
          </fieldset>
        );
      })}
      {rows.length < (multi ? 80 : 24) && <button type="button" className="btn btn-outline w-full" data-testid="add-room" onClick={() => onChange([...rows, { label: `Room ${rows.length + 1}`, unit: multi ? rows[rows.length - 1]?.unit ?? "" : undefined, width: "", length: "" }])}>Add another room</button>}
      {measured.length > 0 && <p className="text-sm text-char/80" data-testid="area">Your floor measurements add up to about <b>{rectanglesAreaSqFt(measured)} sq ft</b>. We&rsquo;ll confirm on site.</p>}
    </div>
  );
}

function Correction({ base, steps, media, queue, onFiles, onRetry, onDone }: { base: string; steps: Step[]; media: Media[]; queue: QueueItem[]; onFiles: (s: Step, f: FileList | null) => void; onRetry: (q: QueueItem) => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [field, setField] = useState("");
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = useMemo(() => steps.flatMap((s) => (s.kind === "measure" ? s.fields : [])), [steps]);
  const photoSteps = steps.filter((s): s is Extract<Step, { kind: "photo" | "video" }> => s.kind === "photo");
  const [ps, setPs] = useState(photoSteps[0]?.id ?? "");
  async function send() {
    setBusy(true); setMsg("");
    const body = { answers: {}, footprint: [], measures: field && val ? { [field]: { raw: val } } : {}, correction_note: note || undefined };
    const r = await api(`${base}/correct`, { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) { setMsg("Thanks, we've added that to your walkthrough."); setNote(""); setVal(""); setTimeout(onDone, 1200); } else setMsg(r.error ?? "Couldn't send that.");
  }
  const sel = photoSteps.find((s) => s.id === ps);
  return (
    <section className="space-y-5" data-testid="wt-correction">
      <h1 className="font-display text-[26px] text-char">Add a correction</h1>
      <label className="block"><span className="label">What should we know?</span><textarea className="field min-h-[120px] text-[16px]" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} data-testid="correction-note" /></label>
      {fields.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <label className="block"><span className="label">Fix a measurement</span><select className="field" value={field} onChange={(e) => setField(e.target.value)}><option value="">Choose…</option>{fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
          <label className="block"><span className="label">New value</span><input className="field text-[16px]" value={val} onChange={(e) => setVal(e.target.value.slice(0, 30))} placeholder={`e.g. 4' 2"`} /></label>
        </div>
      )}
      {sel && (
        <div className="border-t border-line pt-4">
          <label className="block"><span className="label">Add photos to</span><select className="field" value={ps} onChange={(e) => setPs(e.target.value)}>{photoSteps.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          <div className="mt-3"><MediaStep step={sel} media={media.filter((m) => m.step_id === sel.id)} queue={queue.filter((q) => q.stepId === sel.id)} onFiles={(f) => onFiles(sel, f)} onRemove={() => undefined} onRetry={onRetry} onDismiss={() => undefined} /></div>
        </div>
      )}
      {msg && <p className="text-[14px] text-char" role="status">{msg}</p>}
      <div className="flex gap-3"><button className="btn btn-outline flex-1" onClick={onDone}>Cancel</button><button className="btn btn-cedar flex-1" disabled={busy || (!note.trim() && !(field && val))} onClick={send} data-testid="correction-send">Send correction</button></div>
    </section>
  );
}
