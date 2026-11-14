import { adminRoute, ajson } from "@/lib/p4/admin-api";
import { flags } from "@/lib/p4/flags";
import { liveAdapter, mockAdapter } from "@/lib/datamoon/adapter";

export const runtime = "nodejs";

/**
 * Topic discovery. The DataMoon topic search endpoint is documented as unauthenticated and free, but it is still an
 * external call, so it only runs when DATAMOON_TOPIC_SEARCH_ENABLED=true. Otherwise synthetic topics are returned.
 */
export const GET = adminRoute("datamoon.read", async ({ req }) => {
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") === "b2b" ? "b2b" : "b2c";
  const kw = (u.searchParams.get("q") ?? "").slice(0, 80);
  if (kw.trim().length < 3) return ajson({ ok: false, error: "Type at least 3 characters" }, 422);
  if (!flags().datamoonTopicSearch) return { ok: true, synthetic: true, note: "Topic search flag off: synthetic topics shown", ...(await mockAdapter().listTopics(kind, kw)) };
  return { ok: true, synthetic: false, ...(await liveAdapter().listTopics(kind, kw)) };
});
