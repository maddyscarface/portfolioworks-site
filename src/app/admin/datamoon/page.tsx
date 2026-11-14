import { pageGuard } from "@/lib/p4/admin-page";
import { BRAND } from "@/lib/p4/flags";
import { can } from "@/lib/p4/rbac";
import { db } from "@/lib/p4/db";
import { dmStatus } from "@/lib/datamoon/config";
import { listRecipes, liveActivationBlockers } from "@/lib/datamoon/service";
import { DOCS_CHECKED_AT, INTENT, MAIN, PROHIBITED_FIELDS } from "@/lib/datamoon/catalog";
import { SYNTHETIC_LABEL } from "@/lib/datamoon/fixtures";
import { Badge, Card, Forbidden, PageTitle, Table, when } from "@/components/admin/ui";
import { Action } from "@/components/admin/Action";
import { MockRun, TopicSearch } from "@/components/admin/DataMoonTools";

export const metadata = { title: "DataMoon" };

export default async function Page() {
  const { staff, allowed } = await pageGuard("datamoon.read");
  if (!allowed || !staff) return <Forbidden perm="datamoon.read" />;
  const st = dmStatus();
  const recipes = await listRecipes(BRAND);
  const runs = await db.list("audience_runs", BRAND, {}, { limit: 20 });
  const tone = (s: string) => (s === "disabled" ? "neutral" : s === "not_connected" ? "warn" : "info") as "neutral" | "warn" | "info";
  return (
    <>
      <PageTitle title="DataMoon audience readiness" sub={`Not connected. No paid calls, purchases or outbound campaigns are possible while flags are off. Docs last checked ${DOCS_CHECKED_AT}. Status never shows "live" until real test evidence is recorded.`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Connection status">
          <Table head={["Family", "Status", "Auth"]} rows={[
            ["Main API (module / ext audiences)", <Badge key="a" tone={tone(st.main)}>{st.main}</Badge>, `${MAIN.auth.module.header} · DATAMOON_MAIN_MODULE_KEY`],
            ["Main API legacy (enrichment / pixel)", <Badge key="b" tone={tone(st.legacy)}>{st.legacy}</Badge>, "api_key in body · DATAMOON_LEGACY_KEY"],
            ["Topic search (free, unauthenticated)", <Badge key="c" tone={tone(st.topicSearch)}>{st.topicSearch}</Badge>, "none"],
            ["Intent API (feeds / exports / credits)", <Badge key="d" tone={tone(st.intent)}>{st.intent}</Badge>, `${INTENT.auth.header} · DATAMOON_INTENT_KEY`],
            ["Intent webhook (export.ready)", <Badge key="e" tone={tone(st.webhook)}>{st.webhook}</Badge>, "HMAC-SHA256 · DATAMOON_INTENT_WEBHOOK_SECRET"],
          ]} />
          <p className="mt-3 text-xs text-stone">Activation flag: {String(st.activation)} · CRM sync flag: {String(st.crmSync)} · per-run ceiling {st.limits.maxRecordsPerRun} · monthly ceiling {st.limits.monthlyRecordCeiling} · budget approved: {String(st.limits.budgetApproved)}</p>
        </Card>
        <Card title="Topic discovery"><TopicSearch /><p className="mt-2 text-xs text-stone">Topic ids for audience builds are integers; mapping a topic name to its id is UNVERIFIED in the public docs and must be confirmed with a key.</p></Card>
      </div>

      <Card title="Recipes (PortfolioWorks · Massachusetts only)" className="mt-5">
        <div className="space-y-5">
          {recipes.map(({ id, recipe: r, issues }) => {
            const blockers = liveActivationBlockers(r);
            return (
              <div key={id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.name} <span className="text-xs font-normal text-stone">· {r.audience_type} · {r.api_family} · {r.market}</span></p><Badge tone={r.status === "approved" ? "good" : "warn"}>{r.status}</Badge></div>
                <p className="mt-1 text-sm text-char/80">{r.purpose}</p>
                <p className="mt-1 text-xs">Topics (hypotheses until confirmed): {r.topics.map((t) => t.label).join(", ")} · Criteria: {r.criteria.map((c) => `${c.field}${c.verified ? "" : " (UNVERIFIED)"}`).join(", ") || "none (intent filters must be discovered)"} · ZIPs: {r.geography.zips.length || "owner to choose"} · CTA: {r.conversion_cta}</p>
                <p className="mt-1 text-xs">Approvals: legal {r.approvals.legal ? "✓" : "—"} · export {r.approvals.export ? "✓" : "—"} · CRM {r.approvals.crm_sync ? "✓" : "—"}</p>
                <details className="mt-2 text-xs"><summary className="cursor-pointer text-stone">{blockers.length} live-activation blockers · {issues.length} validation issues</summary><ul className="mt-1 list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></details>
                <div className="mt-2 flex flex-wrap gap-2">
                  {can(staff, "datamoon.recipe.approve_legal", BRAND) && !r.approvals.legal && <Action url={`/admin/api/p4/datamoon/recipes/${id}/approve`} body={{ kind: "legal" }} label="Record legal / purpose approval" />}
                  {can(staff, "datamoon.recipe.approve_export", BRAND) && r.approvals.legal && !r.approvals.export && <Action url={`/admin/api/p4/datamoon/recipes/${id}/approve`} body={{ kind: "export" }} label="Record export approval (owner)" />}
                  {can(staff, "datamoon.recipe.approve_crm", BRAND) && r.approvals.legal && !r.approvals.crm_sync && <Action url={`/admin/api/p4/datamoon/recipes/${id}/approve`} body={{ kind: "crm_sync" }} label="Record CRM sync approval" />}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-stone">Blocked fields (never used for targeting or eligibility): {PROHIBITED_FIELDS.join(", ")}. Imported prospects carry no phone numbers and are tagged no-SMS; no GHL opportunity is created for them.</p>
      </Card>

      {can(staff, "datamoon.import", BRAND) && (
        <Card title="Synthetic pipeline demo" className="mt-5">
          <p className="mb-3 text-sm text-stone">{SYNTHETIC_LABEL}. Runs recipe → quota guard → export → poll → download → import entirely in memory with fixtures. Use failure scenarios to see how errors are handled.</p>
          <MockRun recipes={recipes.map((r) => ({ id: r.id, name: r.recipe.name }))} />
          <div className="mt-4"><Table head={["Run", "Recipe", "Status", "Scenario", "When"]} rows={runs.map((r) => [String(r.id).slice(0, 14), String(r.recipe_id), <Badge key="s" tone={r.status === "imported" ? "good" : r.status === "failed" ? "bad" : "warn"}>{String(r.status)}</Badge>, String(r.scenario ?? ""), when(r.created_at)])} empty="No runs yet." /></div>
        </Card>
      )}
    </>
  );
}
