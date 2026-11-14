import { beforeAll, describe, expect, it } from "vitest";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { isolate, staff } from "./p4-helpers";
import { can, ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/p4/rbac";

const E = (o: Record<string, string> = {}) => o as unknown as NodeJS.ProcessEnv;
beforeAll(() => { isolate(); });

describe("RBAC: deny by default, brand scoped", () => {
  it("unknown role, missing brand or unlisted permission are all denied", () => {
    expect(can(null, "leads.read", "portfolioworks")).toBe(false);
    expect(can({ user: "x", role: "superuser" as never, brands: ["portfolioworks"] }, "leads.read", "portfolioworks")).toBe(false);
    expect(can(staff("owner", ["dumpsterbuddy"]), "leads.read", "portfolioworks")).toBe(false);
    expect(can(staff("owner"), "leads.read", "dumpsterbuddy")).toBe(false);
    expect(can(staff("owner"), "pricebook.write", "portfolioworks")).toBe(true);
  });
  it("only the owner can approve, export, edit the price book or see margins by default", () => {
    for (const p of ["proposal.approve", "proposal.export", "pricebook.write", "estimate.margin.read", "reports.financial"] as const)
      expect(ROLES.filter((r) => ROLE_PERMISSIONS[r].has(p))).toEqual(["owner"]);
  });
  it("read_only and marketer cannot write estimates, see PII or export CSV", () => {
    for (const r of ["read_only", "marketer"] as const) for (const p of ["estimate.write", "pii.read", "leads.export_csv", "media.read"] as const) expect(can(staff(r), p, "portfolioworks")).toBe(false);
  });
  it("every role's permissions are known permissions", () => {
    for (const r of ROLES) for (const p of ROLE_PERMISSIONS[r]) expect(PERMISSIONS).toContain(p);
  });
  it("ADMIN_USERS_JSON accounts authenticate with PBKDF2 and keep their role/brands", async () => {
    const { staffFromAuthorization } = await import("@/lib/p4/auth");
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync("correct horse", Buffer.from(salt, "hex"), 100000, 32, "sha256").toString("hex");
    const env = E({ ADMIN_USERS_JSON: JSON.stringify([{ user: "maria", role: "estimator", brands: ["portfolioworks"], pbkdf2: `${salt}:100000:${hash}` }]) });
    const b = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
    expect(staffFromAuthorization(b("maria", "correct horse"), env)).toEqual({ user: "maria", role: "estimator", brands: ["portfolioworks"] });
    expect(staffFromAuthorization(b("maria", "wrong"), env)).toBeNull();
    expect(staffFromAuthorization(b("anyone", "x"), env)).toBeNull();
    expect(staffFromAuthorization(b("x", "pw"), E({ ADMIN_PASSWORD: "pw" }))?.role).toBe("owner");
    expect(staffFromAuthorization("Bearer abc", E({ ADMIN_PASSWORD: "pw" }))).toBeNull();
  });
  it("admin API routes return 401 without credentials and 403 for a role without the permission", async () => {
    process.env.ADMIN_PASSWORD = "owner-pw";
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync("ro-pw", Buffer.from(salt, "hex"), 100000, 32, "sha256").toString("hex");
    process.env.ADMIN_USERS_JSON = JSON.stringify([{ user: "ro", role: "read_only", brands: ["portfolioworks"], pbkdf2: `${salt}:100000:${hash}` }, { user: "other", role: "owner", brands: ["dumpsterbuddy"], pbkdf2: `${salt}:100000:${hash}` }]);
    const { GET } = await import("@/app/admin/api/p4/pricebook/route");
    const call = (h?: string) => GET(new Request("http://localhost/admin/api/p4/pricebook", { headers: h ? { authorization: h } : {} }), {} as never);
    expect((await call()).status).toBe(401);
    expect((await call(`Basic ${Buffer.from("ro:ro-pw").toString("base64")}`)).status).toBe(403);
    expect((await call(`Basic ${Buffer.from("other:ro-pw").toString("base64")}`)).status).toBe(403); // owner of another brand
    expect((await call(`Basic ${Buffer.from("x:owner-pw").toString("base64")}`)).status).toBe(200);
    delete process.env.ADMIN_PASSWORD; delete process.env.ADMIN_USERS_JSON;
  });
  it("store reads are brand scoped", async () => {
    const { db } = await import("@/lib/p4/db");
    const p = await db.insert("projects", "portfolioworks", { status: "new", service: "turnover" });
    expect(await db.get("projects", "dumpsterbuddy", p.id)).toBeNull();
    expect(await db.list("projects", "dumpsterbuddy", {})).toEqual([]);
  });
});

describe("private estimator", () => {
  async function project() {
    const svc = await import("@/lib/walkthrough/service");
    const p = await svc.createProject("portfolioworks", { service: "turnover", customer: { first_name: "Syn", email: "syn@example.test", town: "Quincy" }, source: "staff", actor: staff("owner") });
    return p;
  }
  const lines = [{ id: "l1", category: "materials", description: "Paint and drywall materials", quantity: 192, unit: "sq ft", rate: 10, rate_source: "manual" }, { id: "l2", category: "labor", description: "Build", quantity: 40, unit: "hr", rate: 80, rate_source: "manual" }];

  it("never produces a figure while any rate is blank; price book ships blank", async () => {
    const E = await import("@/lib/estimator/service");
    const { compute } = await import("@/lib/estimator/model");
    expect(compute([{ ...lines[0], rate: null } as never], { minimum: null, mobilization: null, waste_pct: null, tax_pct: null, margin_pct: null }).complete).toBe(false);
    expect(await E.listPricebook("portfolioworks", staff("owner"))).toEqual([]);
    const p = await project();
    const est = await E.createDraft("portfolioworks", p.id, staff("estimator"));
    expect((est.lines as { rate: number | null }[]).every((l) => l.rate === null)).toBe(true);
    await expect(E.approveInternal("portfolioworks", est.id, staff("owner"))).rejects.toThrow(/Missing rates|need a manual/);
  });

  it("estimator can draft but not approve, export or see margin; owner approves then exports DOCX+PDF privately", async () => {
    const E = await import("@/lib/estimator/service");
    const p = await project();
    const est = await E.createDraft("portfolioworks", p.id, staff("estimator"));
    const upd = await E.updateEstimate("portfolioworks", est.id, { expected_version: 0, lines, adjustments: { minimum: null, mobilization: 200, waste_pct: 10, tax_pct: 6.625, margin_pct: 25 } }, staff("estimator"));
    expect((upd.adjustments as { margin_pct: number | null }).margin_pct).toBeNull(); // estimator cannot set margin
    const view = E.staffEstimateView(upd, staff("estimator"), "portfolioworks");
    expect(view.can_see_margin).toBe(false);
    expect("margin_amount" in view.calc).toBe(false);
    expect("margin_pct" in view.adjustments).toBe(false);
    await expect(E.approveInternal("portfolioworks", est.id, staff("estimator"))).rejects.toThrow(/Forbidden/);
    await expect(E.updateEstimate("portfolioworks", est.id, { expected_version: 0, notes_internal: "stale write" }, staff("owner"))).rejects.toThrow(/Someone else saved/);
    await E.updateEstimate("portfolioworks", est.id, { expected_version: 1, adjustments: { minimum: null, mobilization: 200, waste_pct: 10, tax_pct: 6.625, margin_pct: 25 } }, staff("owner"));
    await expect(E.exportProposal("portfolioworks", est.id, staff("owner"))).rejects.toThrow(/Approve/);
    await E.approveInternal("portfolioworks", est.id, staff("owner"));
    await expect(E.exportProposal("portfolioworks", est.id, staff("manager"))).rejects.toThrow(/Forbidden/);
    const out = await E.exportProposal("portfolioworks", est.id, staff("owner"));
    expect(out.map((o) => o.format).sort()).toEqual(["docx", "pdf"]);
    const { getObject, db } = await import("@/lib/p4/db");
    const docx = await getObject(String(out.find((o) => o.format === "docx")!.storage_path));
    const pdf = await getObject(String(out.find((o) => o.format === "pdf")!.storage_path));
    expect(docx!.subarray(0, 2).toString()).toBe("PK");
    expect(pdf!.subarray(0, 5).toString()).toBe("%PDF-");
    // nothing was sent: the outbox has an export event but no send/email event types
    const types = (await db.list("event_outbox", "portfolioworks", {})).map((e) => String(e.type));
    expect(types).toContain("proposal.exported");
    expect(types.some((t) => /email|send|sms/.test(t) && t !== "proposal.marked_sent_externally")).toBe(false);
    // an edit after approval returns it to draft and blocks export until re-approved
    const cur = await db.get("estimates", "portfolioworks", est.id);
    await E.updateEstimate("portfolioworks", est.id, { expected_version: Number(cur!.version), exclusions: "Changed" }, staff("owner"));
    expect((await db.get("estimates", "portfolioworks", est.id))?.status).toBe("draft");
    await expect(E.exportProposal("portfolioworks", est.id, staff("owner"))).rejects.toThrow(/Approve/);
  });

  it("a customer correction makes the estimate stale and blocks approval until refreshed", async () => {
    const E = await import("@/lib/estimator/service");
    const svc = await import("@/lib/walkthrough/service");
    const p = await project();
    const est = await E.createDraft("portfolioworks", p.id, staff("owner"));
    await E.updateEstimate("portfolioworks", est.id, { expected_version: 0, lines }, staff("owner"));
    await svc.recordRevision("portfolioworks", p.id, null, { answers: {}, footprint: [], measures: { ceiling_height: { raw: "9'" } } }, "correction", "customer");
    await expect(E.approveInternal("portfolioworks", est.id, staff("owner"))).rejects.toThrow(/walkthrough changed/);
    await E.refreshFromCapture("portfolioworks", est.id, staff("owner"));
    await expect(E.approveInternal("portfolioworks", est.id, staff("owner"))).resolves.toHaveProperty("hash");
  });

  it("audit log is hash-chained and contains no prices", async () => {
    const { db } = await import("@/lib/p4/db");
    const { verifyAuditChain } = await import("@/lib/p4/audit");
    const rows = await db.list("audit_log", "portfolioworks", {}, { limit: 1000 });
    expect(rows.length).toBeGreaterThan(5);
    expect(verifyAuditChain(rows)).toBe(true);
    expect(JSON.stringify(rows.map((r) => r.detail))).not.toMatch(/\$\d|"rate"|margin_pct/);
  });
});

describe("PortfolioWorks quote placeholders and privacy review", () => {
  it("draft from a turnover capture has every owner-only placeholder with BLANK rates and no figure", async () => {
    const { draftFromCapture, compute, LINE_CATEGORIES } = await import("@/lib/estimator/model");
    const { normalizeProgress } = await import("@/lib/walkthrough/capture");
    const { templateFor } = await import("@/lib/walkthrough/templates");
    const cap = normalizeProgress(templateFor("turnover")!, { answers: { paint_drywall: ["full_paint"], flooring: ["lvp"], bath: ["fixtures"], other_trades: ["cleaning"] }, footprint: [{ label: "Bedroom", width: "10'", length: "12'" }], measures: { ceiling_height: { raw: "8'" }, bathrooms: { raw: "1" } } });
    const { scope, lines } = draftFromCapture("turnover", cap);
    for (const c of ["labor", "trades", "materials", "cleaning", "flooring", "fixtures", "disposal", "mobilization", "access", "schedule_contingency"]) {
      expect(LINE_CATEGORIES).toContain(c);
      expect(lines.some((l) => l.category === c), c).toBe(true);
    }
    expect(lines.every((l) => l.rate === null && l.rate_source === null)).toBe(true);
    expect(scope.find((x) => x.id === "floor")?.quantity).toBe(120);
    expect(scope.find((x) => x.id === "wall")?.quantity).toBe(352); // 2×(10+12) ft × 8 ft
    expect(compute(lines, { minimum: null, mobilization: null, waste_pct: null, tax_pct: null, margin_pct: null }).complete).toBe(false);
  });

  it("only owner, manager and legal reviewer can place or view privacy-held media", async () => {
    expect(can(staff("owner"), "media.privacy_review", "portfolioworks")).toBe(true);
    expect(can(staff("manager"), "media.privacy_review", "portfolioworks")).toBe(true);
    expect(can(staff("legal_reviewer"), "media.privacy_review", "portfolioworks")).toBe(true);
    for (const r of ["estimator", "operator", "marketer", "read_only"] as const) expect(can(staff(r), "media.privacy_review", "portfolioworks"), r).toBe(false);
    const { salt, hash } = (() => { const s = randomBytes(16).toString("hex"); return { salt: s, hash: pbkdf2Sync("pw", Buffer.from(s, "hex"), 100000, 32, "sha256").toString("hex") }; })();
    process.env.ADMIN_USERS_JSON = JSON.stringify([
      { user: "est", role: "estimator", brands: ["portfolioworks"], pbkdf2: `${salt}:100000:${hash}` },
      { user: "mgr", role: "manager", brands: ["portfolioworks"], pbkdf2: `${salt}:100000:${hash}` },
    ]);
    try {
      const { db } = await import("@/lib/p4/db");
      const m = await db.insert("media_assets", "portfolioworks", { project_id: "p1", status: "validated", kind: "image", mime: "image/jpeg", storage_path: "x/none", display_name: "a.jpg" });
      const R = await import("@/app/admin/api/p4/media/[id]/route");
      const { req: rq, params } = await import("./p4-helpers");
      const auth = (u: string) => ({ authorization: `Basic ${btoa(`${u}:pw`)}`, "content-type": "application/json" });
      const est = await R.PATCH(rq(`/admin/api/p4/media/${m.id}`, { method: "PATCH", headers: auth("est"), body: JSON.stringify({ action: "privacy_hold" }) }), params({ id: m.id }));
      expect(est.status).toBe(403);
      const mgr = await R.PATCH(rq(`/admin/api/p4/media/${m.id}`, { method: "PATCH", headers: auth("mgr"), body: JSON.stringify({ action: "privacy_hold", reason: "face in mirror" }) }), params({ id: m.id }));
      expect(mgr.status).toBe(200);
      expect((await db.get("media_assets", "portfolioworks", m.id))?.privacy_hold).toBe(true);
      const view = await R.GET(rq(`/admin/api/p4/media/${m.id}`, { headers: auth("est") }), params({ id: m.id }));
      expect(view.status).toBe(403);
      const log = await db.list("audit_log", "portfolioworks", {}, { limit: 1000 });
      expect(log.some((e) => e.action === "media.privacy_hold")).toBe(true);
    } finally { delete process.env.ADMIN_USERS_JSON; }
  });
});
