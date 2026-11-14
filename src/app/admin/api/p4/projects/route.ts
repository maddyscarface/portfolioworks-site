import { z } from "zod";
import { adminRoute, body } from "@/lib/p4/admin-api";
import { BRAND } from "@/lib/p4/flags";
import { db } from "@/lib/p4/db";
import { can } from "@/lib/p4/rbac";
import { createProject } from "@/lib/walkthrough/service";
import { WALKTHROUGH_SERVICES } from "@/lib/walkthrough/templates";
import { maskEmail } from "@/lib/p4/pii";

export const runtime = "nodejs";

export const GET = adminRoute("projects.read", async ({ req, staff }) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").toLowerCase().trim();
  const pii = can(staff, "pii.read", BRAND);
  const rows = await db.list("projects", BRAND, {}, { limit: 500 });
  const out = rows.filter((p) => !q || JSON.stringify([p.id, p.service, p.status, (p.customer as Record<string, string>)?.town, (p.customer as Record<string, string>)?.first_name, (p.customer as Record<string, string>)?.last_name, (p.customer as Record<string, string>)?.email]).toLowerCase().includes(q))
    .map((p) => ({ id: p.id, service: p.service, status: p.status, created_at: p.created_at, readiness: p.readiness, estimate_stale: p.estimate_stale, customer: pii ? p.customer : { first_name: (p.customer as { first_name?: string })?.first_name, town: (p.customer as { town?: string })?.town, email: maskEmail((p.customer as { email?: string })?.email) } }));
  return { ok: true, projects: out };
});

const create = z.object({ service: z.enum(WALKTHROUGH_SERVICES), first_name: z.string().max(80).optional(), last_name: z.string().max(80).optional(), email: z.string().email().max(200), town: z.string().max(80).optional(), zip: z.string().regex(/^\d{5}$/).optional(), customer_type: z.string().max(20).optional() });
export const POST = adminRoute("projects.write", async ({ req, staff }) => {
  const b = create.parse(await body(req));
  const p = await createProject(BRAND, { service: b.service, source: "staff", customer_type: b.customer_type, customer: { first_name: b.first_name, last_name: b.last_name, email: b.email, town: b.town, zip: b.zip }, actor: staff });
  return { ok: true, id: p.id };
});
