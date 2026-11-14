import { z } from "zod";
import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { createInvite } from "@/lib/walkthrough/service";

export const runtime = "nodejs";
const schema = z.object({ kind: z.enum(["initial", "followup"]).default("initial"), requested_steps: z.array(z.string().max(40)).max(20).optional(), note: z.string().max(500).optional() });

/** Creates a customer link and returns it ONCE (only the hash is stored). Nothing is emailed: staff deliver it. */
export const POST = adminRoute<{ id: string }>("walkthrough.invite", async ({ req, staff, params }) => {
  const b = schema.parse(await body(req));
  const { token, session } = await createInvite(BRAND, params.id, { kind: b.kind, requested_steps: b.requested_steps, note: b.note, actor: staff });
  const origin = new URL(req.url).origin;
  return { ok: true, session_id: session.id, expires_at: session.expires_at, url: `${origin}/w/${token}`, delivery: "Copy this link and send it yourself. The site does not email customers." };
});
