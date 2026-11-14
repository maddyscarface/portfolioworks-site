import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/p4/admin-page";
import { projectDetail } from "@/lib/p4/admin-data";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { templateFor } from "@/lib/walkthrough/templates";
import { OUTCOME_LABELS, type NormalizedCapture, type Outcome } from "@/lib/walkthrough/capture";
import { formatFeetInches } from "@/lib/walkthrough/units";
import { A, Badge, Card, Forbidden, PageTitle, Table, statusTone, when } from "@/components/admin/ui";
import { Action } from "@/components/admin/Action";
import { InvitePanel } from "@/components/admin/ProjectForms";

export const metadata = { title: "Project" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { staff, allowed } = await pageGuard("projects.read");
  if (!allowed || !staff) return <Forbidden perm="projects.read" />;
  const reviewer = can(staff, "media.privacy_review", BRAND);
  const d = await projectDetail(id, staff);
  if (!d) notFound();
  const p = d.project;
  const c = (p.customer ?? {}) as Record<string, string>;
  const tpl = templateFor(String(p.service));
  const ready = p.readiness as { outcome: Outcome; reasons: string[]; missing: string[]; unknown_required: string[]; site_check: string[] } | null;
  const latest = d.revisions[0];
  const norm = latest?.normalized as NormalizedCapture | undefined;
  const stepTitle = (sid: string) => tpl?.steps.find((s) => s.id === sid)?.title ?? sid;
  return (
    <>
      <PageTitle title={`${c.first_name ?? "Customer"} ${c.last_name ?? ""} · ${tpl?.label ?? p.service}`} sub={`${p.id} · created ${when(p.created_at)} · source ${p.source}`}>
        <Badge tone={statusTone(String(p.status))}>{String(p.status)}</Badge>
      </PageTitle>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title="Readiness (internal suggestion)">
            {ready ? (
              <div className="space-y-2 text-sm">
                <p><Badge tone={ready.outcome === "site_check" ? "warn" : ready.outcome === "ready_for_remote_quote" ? "good" : "info"}>{OUTCOME_LABELS[ready.outcome]}</Badge> <span className="text-stone">The estimator decides; this is never shown to the customer.</span></p>
                {ready.reasons.length > 0 && <p>Why: {ready.reasons.join("; ")}</p>}
                {ready.site_check.length > 0 && <p className="text-[#8a1f14]">Site check triggers: {ready.site_check.join("; ")}</p>}
                {ready.missing.length > 0 && <p>Missing photos: {ready.missing.map(stepTitle).join(", ")}</p>}
                {ready.unknown_required.length > 0 && <p>Unknown required measurements: {ready.unknown_required.join(", ")}</p>}
              </div>
            ) : <p className="text-sm text-stone">No submitted walkthrough yet.</p>}
          </Card>

          <Card title={`Measurements ${latest ? `(revision ${latest.revision}, ${latest.reason}, ${when(latest.created_at)})` : ""}`}>
            {norm ? (
              <div className="space-y-4 text-sm">
                <Table head={["Area", "Width", "Length", "Notes"]} rows={norm.footprint.map((r) => [r.label, r.width_in ? formatFeetInches(r.width_in) : r.raw_width || "—", r.length_in ? formatFeetInches(r.length_in) : r.raw_length || "—", r.unknown ? "customer: unknown" : r.invalid ? <Badge key="i" tone="bad">unparseable: {r.raw_width} × {r.raw_length}</Badge> : r.assumed_unit ? <Badge key="u" tone="warn">unit assumed (ft)</Badge> : "customer tape"])} empty="No footprint." />
                {norm.plan_area_sqft !== null && <p>Plan area from customer tape: <b>{norm.plan_area_sqft} sq ft</b> <span className="text-stone">(customer-reported, unverified)</span></p>}
                <Table head={["Measurement", "Value", "Raw", "Source / confidence"]} rows={norm.measures.map((m) => [m.label, m.unknown ? "unknown" : m.invalid ? <Badge key="i" tone="bad">invalid</Badge> : m.display ?? String(m.count ?? ""), m.raw || "—", `${m.source} · ${m.confidence}${m.assumed_unit ? " · unit assumed" : ""}`])} />
                {Object.entries(norm.answers).length > 0 && <Table head={["Question", "Answer"]} rows={Object.entries(norm.answers).map(([k, v]) => [stepTitle(k), Array.isArray(v) ? v.join(", ") : <span key="t" className="whitespace-pre-wrap">{v}</span>])} />}
                {norm.assist_requested && <p><Badge tone="info">Customer asked for a live call or site visit</Badge></p>}
                {(latest?.progress as { correction_note?: string })?.correction_note && <p>Customer correction: <i>{(latest.progress as { correction_note?: string }).correction_note}</i></p>}
              </div>
            ) : <p className="text-sm text-stone">Nothing submitted yet.</p>}
            {d.revisions.length > 1 && <p className="mt-3 text-xs text-stone">Earlier revisions are kept immutably: {d.revisions.slice(1).map((r) => `r${r.revision} (${r.reason})`).join(", ")}</p>}
          </Card>

          <Card title={`Photos, video & plans (${d.media.length})`}>
            <p className="mb-3 text-xs text-stone">Customer-attested: no people or personal items. If a face, document, mail, screen or personal item is in frame, place the file on privacy hold or delete it. Media is never used for ads or AI.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {d.media.map((m) => (
                <figure key={m.id} className="border border-line bg-bone p-1.5 text-xs" data-testid="admin-media">
                  {m.privacy_hold && !reviewer ? <div className="grid aspect-square w-full place-items-center bg-bone-2 p-3 text-center text-stone" data-testid="media-held">Privacy hold: visible to privacy reviewers only</div>
                    : m.kind === "image" ? <a href={`/admin/api/p4/media/${m.id}`} target="_blank" rel="noreferrer"><img src={`/admin/api/p4/media/${m.id}`} alt={`${stepTitle(String(m.step_id))}`} className="aspect-square w-full object-cover" loading="lazy" /></a>
                    : m.kind === "document" ? <a href={`/admin/api/p4/media/${m.id}`} target="_blank" rel="noreferrer" className="grid aspect-square w-full place-items-center bg-white p-3 text-center underline">Open PDF</a>
                    : <video src={`/admin/api/p4/media/${m.id}`} controls preload="none" className="aspect-square w-full bg-char object-contain" />}
                  <figcaption className="mt-1 truncate">{stepTitle(String(m.step_id))}{m.privacy_hold ? " · held" : ""}</figcaption>
                  <p className="text-stone">{String(m.metadata)}
                    {reviewer && <> · <Action url={`/admin/api/p4/media/${m.id}`} method="PATCH" body={{ action: m.privacy_hold ? "privacy_release" : "privacy_hold" }} label={m.privacy_hold ? "Release hold" : "Privacy hold"} className="text-xs underline" testId={`hold-${m.id}`} /></>}
                    {can(staff, "media.delete", BRAND) && <> · <Action url={`/admin/api/p4/media/${m.id}`} method="DELETE" label="Delete" confirm="Delete this file permanently?" className="text-xs underline" /></>}</p>
                </figure>
              ))}
            </div>
            {!d.media.length && <p className="text-sm text-stone">No media yet.</p>}
          </Card>

          {can(staff, "estimate.read", BRAND) && (
            <Card title="Private estimates">
              <Table head={["Revision", "Status", "Capture rev", "Total (staff only)", ""]} rows={d.estimates.map((e) => [<A key="a" href={`/admin/estimates/${e.id}`}>R{String(e.revision)}</A>, <Badge key="b" tone={statusTone(String(e.status))}>{String(e.status)}</Badge>, String(e.capture_revision_no), e.calc.complete ? `$${e.calc.total.toLocaleString("en-US")}` : <span key="i" className="text-stone">incomplete</span>, e.stale ? <Badge key="s" tone="warn">stale: {String(e.stale_reason ?? "")}</Badge> : ""])} empty="No estimate yet." />
              {can(staff, "estimate.write", BRAND) && <div className="mt-3"><Action url={`/admin/api/p4/projects/${p.id}/estimates`} label={d.estimates.length ? "Start a new estimate revision" : "Create draft estimate"} testId="create-estimate" /></div>}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Customer">
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-stone">Name: </dt><dd className="inline">{c.first_name} {c.last_name}</dd></div>
              <div><dt className="inline text-stone">Email: </dt><dd className="inline">{c.email}</dd></div>
              {c.phone && <div><dt className="inline text-stone">Phone: </dt><dd className="inline">{c.phone}</dd></div>}
              <div><dt className="inline text-stone">Town: </dt><dd className="inline">{c.town} {c.zip}</dd></div>
              <div><dt className="inline text-stone">Type: </dt><dd className="inline">{String(p.customer_type)}</dd></div>
              {p.plan_sqft ? <div><dt className="inline text-stone">Planner size: </dt><dd className="inline">{String(p.plan_sqft)} sq ft (customer)</dd></div> : null}
              {p.lead_id ? <div><dt className="inline text-stone">Lead: </dt><dd className="inline">{String(p.lead_id)}</dd></div> : null}
            </dl>
          </Card>
          {can(staff, "walkthrough.invite", BRAND) && tpl && <Card title="Customer links"><InvitePanel projectId={String(p.id)} steps={tpl.steps.map((s) => ({ id: s.id, title: s.title }))} /></Card>}
          <Card title="Sessions">
            <ul className="space-y-2 text-sm">
              {d.sessions.map((s) => (
                <li key={String(s.id)} className="border-b border-bone-2 pb-2">
                  <p><Badge tone={statusTone(String(s.status))}>{String(s.status)}</Badge> {String(s.kind)} · expires {when(s.expires_at)}</p>
                  {(s.requested_steps as string[])?.length ? <p className="text-xs text-stone">Requested: {(s.requested_steps as string[]).map(stepTitle).join(", ")}</p> : null}
                  {s.status !== "revoked" && s.status !== "submitted" && can(staff, "walkthrough.invite", BRAND) && <Action url={`/admin/api/p4/sessions/${s.id}/revoke`} label="Revoke link" confirm="Revoke this customer link?" className="text-xs underline" />}
                </li>
              ))}
            </ul>
            {!d.sessions.length && <p className="text-sm text-stone">No links yet.</p>}
          </Card>
          {d.exports.length > 0 && <Card title="Private exports"><ul className="space-y-1 text-sm">{d.exports.map((x) => <li key={String(x.id)}><a className="underline" href={`/admin/api/p4/exports/${x.id}`}>{String(x.file_name)}</a> <span className="text-xs text-stone">{when(x.created_at)} · {String(x.created_by)}</span></li>)}</ul></Card>}
        </div>
      </div>
    </>
  );
}
