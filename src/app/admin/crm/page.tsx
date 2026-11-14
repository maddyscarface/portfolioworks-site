import { pageGuard } from "@/lib/p4/admin-page";
import { db } from "@/lib/p4/db";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { BACKOFF_SECONDS, MAX_ATTEMPTS } from "@/lib/p4/outbox";
import { ghlMode } from "@/lib/crm/ghl";
import { Badge, Card, Forbidden, PageTitle, Table, statusTone, when } from "@/components/admin/ui";
import { Action } from "@/components/admin/Action";

export const metadata = { title: "CRM sync" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { staff, allowed } = await pageGuard("crm.read");
  if (!allowed) return <Forbidden perm="crm.read" />;
  const all = await db.list("event_outbox", BRAND, {}, { limit: 1000 });
  const rows = status ? all.filter((e) => e.status === status) : all;
  const counts = all.reduce<Record<string, number>>((a, e) => ({ ...a, [String(e.status)]: (a[String(e.status)] ?? 0) + 1 }), {});
  const replay = can(staff, "crm.replay", BRAND);
  return (
    <>
      <PageTitle title="CRM sync & event outbox" sub={`Every event is stored before any external call. Retries back off ${BACKOFF_SECONDS.map((s) => (s < 3600 ? `${s / 60}m` : `${s / 3600}h`)).join(" → ")}; after ${MAX_ATTEMPTS} attempts an event moves to dead-letter and can be replayed. GHL mode: ${ghlMode() === "live" ? "API v2" : ghlMode() === "off" ? "off" : "log only (no credentials)"}. No emails or SMS are sent from here.`}>
        {replay && <Action url="/admin/api/p4/outbox" body={{ action: "process" }} label="Process now" className="btn btn-char !min-h-9 !text-sm" testId="outbox-process" />}
      </PageTitle>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">{["", "pending", "done", "skipped", "dead"].map((s) => <a key={s} href={s ? `/admin/crm?status=${s}` : "/admin/crm"} className={`rounded-full border px-3 py-1 ${status === s || (!status && !s) ? "border-char bg-char text-white" : "border-line bg-white"}`}>{s || "all"} {s ? `(${counts[s] ?? 0})` : `(${all.length})`}</a>)}</div>
      <Card>
        <Table head={["Event", "Ref", "Status", "Attempts", "Next / processed", "Result / error", ""]} rows={rows.map((e) => [String(e.type), `${e.ref_type}:${String(e.ref_id).slice(0, 14)}`, <Badge key="s" tone={statusTone(String(e.status))}>{String(e.status)}</Badge>, String(e.attempts ?? 0), when(e.status === "pending" ? e.next_attempt_at : e.processed_at ?? e.dead_at), String(e.last_error ?? e.result ?? ""), replay && ["dead", "skipped"].includes(String(e.status)) ? <Action key="r" url="/admin/api/p4/outbox" body={{ action: "replay", id: e.id }} label="Replay" className="text-xs underline" /> : ""])} empty="No events yet." />
      </Card>
    </>
  );
}
