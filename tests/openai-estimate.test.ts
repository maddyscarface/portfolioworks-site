import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { buildOpenAiEvent, buildUser, normName, normPhone, openAiStageEvent, sendOpenAiEvent } from "@/lib/openai-ads/server";
import { oaiqSnippet } from "@/lib/openai-ads/client";
import { budgetFit, calendarLink, qualifierFields, qualifierScore, sanitizeQualifiers, typicalRange } from "@/lib/estimate/qualifiers";
import { renderLeadBrief } from "@/lib/estimate/lead-brief";
import { estimateConfig as cfg, briefTheme } from "@/config/estimate";

const h = (s: string) => createHash("sha256").update(s).digest("hex");

describe("OpenAI Conversions API payload", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("normalises and hashes per OpenAI rules", () => {
    expect(normPhone("(617) 555-0123")).toBe("16175550123");
    expect(normPhone("+233 024 123 4567")).toBe("2330241234567");
    expect(normPhone("12")).toBeUndefined();
    expect(normName("  O'Brien-Smith ")).toBe("obriensmith");
    expect(normName("José")).toBe("josé");
    const u = buildUser({ email: " Jane@Example.COM ", phone: "617-555-0123", firstName: "Jane", ip: "203.0.113.9", obref: "ob_1", country: "us", postalCode: "02139" })!;
    expect(u.emails_sha256).toEqual([h("jane@example.com")]);
    expect(u.phone_numbers_sha256).toEqual([h("16175550123")]);
    expect(u.first_names_sha256).toEqual([h("jane")]);
    expect(u.obref).toBe("ob_1");
    expect(u.countries).toEqual(["US"]);
    expect(u.ip_address).toBe("203.0.113.9");
    expect(buildUser({ ip: "not-an-ip" })).toBeUndefined();
  });

  it("builds a lead_created web event that dedups with the pixel event_id", () => {
    const ev = buildOpenAiEvent({ id: "lead_abc12345", type: "lead_created", actionSource: "web", sourceUrl: "https://example.com/lp", oppref: "opp_1", user: { email: "a@b.co" } });
    expect(ev).toMatchObject({ id: "lead_abc12345", type: "lead_created", action_source: "web", source_url: "https://example.com/lp", oppref: "opp_1", data: { type: "customer_action" } });
    expect(typeof ev.timestamp_ms).toBe("number");
  });

  it("rejects what OpenAI would reject", () => {
    expect(() => buildOpenAiEvent({ id: "x", type: "lead_created", actionSource: "web" })).toThrow(/source_url/);
    expect(() => buildOpenAiEvent({ id: "x", type: "custom", customEventName: "lead_created", actionSource: "offline" })).toThrow(/custom_event_name/);
    expect(() => buildOpenAiEvent({ id: "x", type: "lead_created", actionSource: "offline", timestampMs: Date.now() - 8 * 864e5 })).toThrow(/7 days/);
  });

  it("maps CRM stages and sends value in cents", () => {
    expect(openAiStageEvent("estimate_booked")).toEqual({ type: "appointment_scheduled" });
    expect(openAiStageEvent("won")).toEqual({ type: "custom", customEventName: "job_won" });
    const ev = buildOpenAiEvent({ id: "opp1:won", type: "custom", customEventName: "job_won", actionSource: "offline", value: 25000.5, properties: { stage: "won" } });
    expect(ev.data).toEqual({ type: "custom", amount: 2500050, currency: "USD", stage: "won" });
  });

  it("skips when not configured and posts to bzr.openai.com when configured", async () => {
    vi.stubEnv("OPENAI_ADS_PIXEL_ID", ""); vi.stubEnv("NEXT_PUBLIC_OPENAI_PIXEL_ID", ""); vi.stubEnv("OPENAI_ADS_API_KEY", "");
    expect((await sendOpenAiEvent({ id: "l1", type: "lead_created", actionSource: "web", sourceUrl: "https://x.co" })).skipped).toBeTruthy();
    vi.stubEnv("OPENAI_ADS_PIXEL_ID", "px_123"); vi.stubEnv("OPENAI_ADS_API_KEY", "key_456"); vi.stubEnv("OPENAI_ADS_VALIDATE_ONLY", "true");
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const r = await sendOpenAiEvent({ id: "l1", type: "lead_created", actionSource: "web", sourceUrl: "https://x.co" }, f as unknown as typeof fetch);
    expect(r.sent).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://bzr.openai.com/v1/events?pid=px_123");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key_456");
    const body = JSON.parse(String(init.body));
    expect(body.validate_only).toBe(true);
    expect(body.events[0].id).toBe("l1");
  });

  it("pixel snippet sets consent before init", () => {
    const s = oaiqSnippet("px_9", "true");
    expect(s.indexOf('oaiq("consent"')).toBeLessThan(s.indexOf('oaiq("init"'));
    expect(s).toContain("https://bzrcdn.openai.com/sdk/oaiq.min.js");
    expect(s).toContain('"pixelId":"px_9"');
  });
});

describe("pre-estimate qualifiers", () => {
  const pt = cfg.projectTypes[0];
  const size = pt.sizes[Math.min(1, pt.sizes.length - 1)];
  const [lo, hi] = size.typical;

  it("drops unknown ids and keeps valid answers", () => {
    const q = sanitizeQualifiers(cfg, { project_type: pt.id, size: size.id, budget: "nope", start: cfg.startOptions[0].id, favorites: ["x", cfg.favorites.options[0]?.id], preferred_date: "2026-13-45", pricing_views: 3, saw_pricing: true, address: " 1 Main St " })!;
    expect(q.project_type).toBe(pt.id);
    expect(q.size).toBe(size.id);
    expect(q.budget).toBeUndefined();
    expect(q.preferred_date).toBeUndefined();
    expect(q.address).toBe("1 Main St");
    expect(q.pricing_views).toBe(3);
    if (cfg.favorites.options.length) expect(q.favorites).toEqual([cfg.favorites.options[0].id]);
  });

  it("classifies budget fit against the typical range", () => {
    expect(typicalRange(cfg, { project_type: pt.id, size: size.id })).toEqual([lo, hi]);
    const below = cfg.budgetBands.find((b) => b.max !== null && b.max < lo);
    const covers = cfg.budgetBands.find((b) => b.min <= (lo + hi) / 2 && (b.max ?? Infinity) >= (lo + hi) / 2);
    if (below) expect(budgetFit(cfg, { project_type: pt.id, size: size.id, budget: below.id }).fit).toBe("below");
    if (covers) expect(budgetFit(cfg, { project_type: pt.id, size: size.id, budget: covers.id }).fit).toBe("within");
    expect(budgetFit(cfg, { project_type: pt.id, size: size.id }).fit).toBe("unknown");
  });

  it("scores, flattens for the CRM and builds a calendar link", () => {
    const covers = cfg.budgetBands.find((b) => b.min <= lo && (b.max ?? Infinity) >= hi) ?? cfg.budgetBands[cfg.budgetBands.length - 2];
    const q = { project_type: pt.id, size: size.id, budget: covers.id, start: cfg.startOptions[0].id, preferred_date: "2026-12-02", preferred_window: cfg.timeWindows[0].id, saw_pricing: true, pricing_views: 2, address: "12 Elm St" };
    expect(qualifierScore(cfg, q)).toBeGreaterThan(0);
    const f = qualifierFields(cfg, q);
    expect(f.est_project_type).toBe(pt.label);
    expect(f.est_saw_pricing).toBe("yes (2x)");
    const link = calendarLink(cfg, q, "Visit", "details")!;
    expect(link).toContain("calendar.google.com");
    expect(link).toContain(`ctz=${encodeURIComponent(cfg.timezone)}`);
    expect(link).toContain("20261202T");
  });

  it("renders the team brief with the screenshot sections and escapes input", () => {
    const q = { project_type: pt.id, size: size.id, budget: cfg.budgetBands[1].id, start: cfg.startOptions[0].id, preferred_date: "2026-10-28", preferred_window: cfg.timeWindows[0].id, favorites: cfg.favorites.options.slice(0, 2).map((o) => o.id), saw_pricing: true, pricing_views: 2, address: "33 Elm St" };
    const b = renderLeadBrief({ cfg, theme: briefTheme, name: "Anthony <b>M</b>", phone: "(617) 555-0123", email: "a@example.com", q });
    expect(b.html).toContain("Wednesday, October 28");
    expect(b.html).toContain("Add to calendar");
    expect(b.html).toContain("Yes · viewed 2×");
    expect(b.html).toContain("How to shape the offer");
    expect(b.html).toContain("Anthony &lt;b&gt;M&lt;/b&gt;");
    expect(b.html).not.toContain("<b>M</b>");
    expect(b.text).toContain("Budget:");
    expect(b.subject).toContain("Anthony");
  });
});
