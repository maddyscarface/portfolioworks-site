// End-to-end: OpenAI pixel + Conversions API dedup, pre-estimate qualifiers, lead brief email.
// Runs against production servers started by start.sh (ports 3101–3104) and mock.mjs.
// Run one site from its project root with `npm run e2e:chatgpt-ads` (see README.txt), or all four
// side by side with E2E_ROOT=/path/to/folder-with-all-four bash tests/e2e-chatgpt-ads/run.sh.
// SITES=comma,list limits which sites are exercised. PW_CHANNEL=chrome uses an installed Chrome.
import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";

const STUB = `(function(){var q=(window.oaiq&&window.oaiq.q)||[];window.__oaiq=[];var f=function(){window.__oaiq.push(JSON.parse(JSON.stringify(Array.from(arguments))))};q.forEach(function(a){f.apply(null,a)});window.oaiq=f;})();`;
const date = (() => { const d = new Date(Date.now() + 9 * 864e5); return d.toISOString().slice(0, 10); })();
const results = [];
const SITES = (process.env.SITES || "buildghana,deckcraft,portfolioworks,stonecraft").split(",").map((x) => x.trim()).filter(Boolean);
const want = (n) => SITES.includes(n);
const launch = () => chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const noop = () => {};
const mockLines = () => (fs.existsSync("/tmp/mock-requests.jsonl") ? fs.readFileSync("/tmp/mock-requests.jsonl", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

async function run(name, port, consentInit, flow) {
  const before = mockLines().length;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route("https://bzrcdn.openai.com/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ctx.route(/googletagmanager|facebook|challenges\.cloudflare/, (r) => r.abort());
  await ctx.addInitScript(`try{${consentInit}}catch(e){}; document.cookie="__obref=ob_e2e_${name}; path=/"; document.cookie="__oppref=opp_e2e_${name}; path=/";`);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const base = `http://127.0.0.1:${port}`;
  const out = { site: name, checks: [] };
  const ok = (label, cond, detail = "") => { out.checks.push({ label, pass: Boolean(cond), detail }); };
  try {
    await flow(page, base, ok);
    await page.waitForURL(/thank-you/, { timeout: 20000 });
    ok("lands on thank-you", true);
    await page.waitForTimeout(800);
    const calls = await page.evaluate(() => window.__oaiq || []);
    const consent = calls.find((c) => c[0] === "consent");
    const init = calls.find((c) => c[0] === "init");
    const measures = calls.filter((c) => c[0] === "measure" && c[1] === "lead_created");
    ok("pixel: consent set before init", consent && calls.indexOf(consent) < calls.indexOf(init) && consent[1] === true, JSON.stringify(consent));
    ok("pixel: init with pixel id", init && init[1].pixelId === "px_e2e");
    ok("pixel: exactly one lead_created", measures.length === 1, String(measures.length));
    const browserId = measures[0]?.[3]?.event_id;
    await page.waitForTimeout(1500);
    const reqs = mockLines().slice(before);
    const capi = reqs.filter((r) => r.url.startsWith("/v1/events")).map((r) => ({ ...r, json: JSON.parse(r.body) }));
    const leadEv = capi.map((r) => r.json.events[0]).find((e) => e.type === "lead_created");
    ok("CAPI: one lead_created sent to pid=px_e2e with Bearer key", capi.length === 1 && capi[0].url.includes("pid=px_e2e") && capi[0].auth === "Bearer key_e2e", capi.map((c) => c.url).join());
    ok("CAPI: validate_only honoured", capi[0]?.json.validate_only === true);
    ok("dedup: server id === pixel event_id", leadEv && browserId && leadEv.id === browserId, `${leadEv?.id} vs ${browserId}`);
    ok("CAPI: obref + oppref forwarded", leadEv?.user?.obref === `ob_e2e_${name}` && leadEv?.oppref === `opp_e2e_${name}`);
    ok("CAPI: email hashed, not raw", /^[a-f0-9]{64}$/.test(leadEv?.user?.emails_sha256?.[0] ?? "") && !capi[0].body.includes("@example.com"));
    const mail = reqs.filter((r) => r.url.startsWith("/emails")).map((r) => JSON.parse(r.body)).find((m) => /Add to calendar|Requested/.test(m.html));
    ok("brief email sent with calendar + budget tiles", mail && mail.html.includes("Add to calendar") && mail.html.includes("Saw pricing") && mail.html.includes("How to shape the offer"), mail?.subject);
    if (mail) fs.writeFileSync(`/tmp/brief-${name}.html`, mail.html);
    out.brief = mail?.subject;
    out.reload = await (async () => {
      await page.reload(); await page.waitForTimeout(800);
      const again = await page.evaluate(() => (window.__oaiq || []).filter((c) => c[0] === "measure").length);
      return again;
    })();
    ok("no re-fire on thank-you reload", out.reload === 0, String(out.reload));
    ok("no page errors", errors.length === 0, errors.join(" | "));
  } catch (e) {
    ok("flow completed", false, String(e).slice(0, 400));
    await page.screenshot({ path: `/tmp/fail-${name}.png`, fullPage: true }).catch(() => {});
  }
  await browser.close();
  results.push(out);
}

const slow = (p) => p.waitForTimeout(400);

const flow_deckcraft = async (page, base, ok) => {
  await page.goto(`${base}/homeowners`);
  await page.locator("#price-guide").scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  await page.goto(`${base}/free-assessment`);
  await page.fill("#first_name", "Anthony"); await page.fill("#last_name", "Monachino"); await page.fill("#email", "anthony@example.com"); await page.fill("#phone", "(617) 555-0123");
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  await page.fill("#town", "Newton"); await page.getByRole("checkbox", { name: "New deck" }).click(); await page.selectOption("#material", "Composite");
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  ok("project type pre-selected from services", (await page.getByTestId("q-project_type-new_deck_composite").getAttribute("aria-pressed")) === "true");
  await page.getByTestId("q-size-16x20").click(); await page.getByTestId("q-add_ons-stairs").click();
  const range = await page.getByTestId("typical-range").innerText();
  ok("typical range shown before budget", range.includes("$21k–$40k"), range);
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  ok("budget required", await page.getByText("Choose a budget range").isVisible());
  await page.getByTestId("q-budget-25_35k").click(); await page.getByTestId("q-start-within_30").click();
  await page.fill('[data-testid="q-preferred_date"]', date); await page.selectOption('[data-testid="q-preferred_window"]', "1200");
  await page.getByTestId("q-favorites-modern_gray").click(); await page.getByTestId("q-favorites-cable_rail").click();
  await page.fill('[data-testid="q-address"]', "12 Maple Ave, Newton MA 02458");
  await page.screenshot({ path: "/tmp/shot-deckcraft-qualifiers.png", fullPage: false });
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  await page.getByRole("button", { name: "Skip photos for now" }).click(); await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /Send My Photos/ }).click();
};
if (want("deckcraft")) await run("deckcraft", 3102, `localStorage.setItem("dc_consent_v1","granted")`, flow_deckcraft);

const flow_stonecraft = async (page, base, ok) => {
  await page.goto(`${base}/residential`);
  await page.locator("#price-guide").scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  await page.goto(`${base}/free-assessment`);
  await page.getByTestId("firstName").fill("Maria"); await page.getByTestId("email").fill("maria@example.com"); await page.getByTestId("phone").fill("6175550199"); await page.getByTestId("zip").fill("02139");
  await page.getByTestId("next").click(); await slow(page);
  await page.getByText("Shower tile & grout").click();
  await page.getByTestId("next").click(); await slow(page);
  ok("project type pre-selected from surfaces", (await page.getByTestId("q-project_type-shower").getAttribute("aria-pressed")) === "true");
  await page.getByTestId("q-size-alcove").click();
  const range = await page.getByTestId("typical-range").innerText();
  ok("typical range shown", range.includes("$1,200–$1,700"), range);
  await page.getByTestId("q-budget-lt500").click();
  ok("below-range note shown", await page.getByTestId("budget-below").isVisible());
  await page.getByTestId("q-budget-1_2k").click(); await page.getByTestId("q-start-2weeks").click();
  await page.fill('[data-testid="q-preferred_date"]', date); await page.selectOption('[data-testid="q-preferred_window"]', "1000");
  await page.getByTestId("q-favorites-bright_white").click();
  await page.screenshot({ path: "/tmp/shot-stonecraft-qualifiers.png" });
  await page.getByTestId("next").click(); await slow(page);
  await page.getByTestId("next").click(); await slow(page);
  await page.getByTestId("contact-consent").check(); await page.waitForTimeout(2500);
  await page.getByTestId("submit").click();
};
if (want("stonecraft")) await run("stonecraft", 3104, `localStorage.setItem("sc_consent_v1",JSON.stringify({analytics_storage:"granted",ad_storage:"granted",ad_user_data:"granted",ad_personalization:"granted"}))`, flow_stonecraft);

const flow_portfolioworks = async (page, base, ok) => {
  await page.goto(`${base}/unit-turn-estimator`);
  await page.getByTestId("estimate-range").scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Submit this unit for a written scope/ }).click();
  const form = page.getByTestId("lead-form");
  await form.scrollIntoViewIfNeeded();
  await form.locator('select[name="customerType"]').selectOption("landlord");
  await page.getByTestId("form-next").click(); await slow(page);
  await page.fill("#zip", "02139"); await page.fill("#addr", "44 Prospect St, Cambridge MA");
  await page.getByTestId("form-next").click(); await slow(page);
  ok("project type pre-selected (turnover)", (await page.getByTestId("q-project_type-turnover").getAttribute("aria-pressed")) === "true");
  ok("continue disabled until answered", await page.getByTestId("form-next").isDisabled());
  await page.getByTestId("q-size-moderate").click(); await page.getByTestId("q-add_ons-lvp").click();
  const range = await page.getByTestId("typical-range").innerText();
  ok("typical range shown", range.includes("$6,000–$14k"), range);
  await page.getByTestId("q-budget-5_15k").click(); await page.getByTestId("q-start-30-days").click();
  await page.fill('[data-testid="q-preferred_date"]', date); await page.selectOption('[data-testid="q-preferred_window"]', "1400");
  await page.getByTestId("q-favorites-rental_grade").click();
  await page.screenshot({ path: "/tmp/shot-portfolioworks-qualifiers.png" });
  await page.getByTestId("form-next").click(); await slow(page);
  await page.fill("#fn", "Dana"); await page.fill("#ln", "Lee"); await page.fill("#em", "dana@example.com"); await page.fill("#pn", "617-555-0144");
  await form.locator('input[name="consentContact"]').check(); await page.waitForTimeout(2600);
  await page.getByTestId("form-next").click();
};
if (want("portfolioworks")) await run("portfolioworks", 3103, `localStorage.setItem("pw_consent","granted")`, flow_portfolioworks);

const flow_buildghana = async (page, base, ok) => {
  await page.goto(`${base}/build-in-ghana`);
  await page.locator("#price-guide").scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  const pv = await page.evaluate(() => JSON.parse(localStorage.getItem("est_pricing_views_v1") || "null"));
  ok("price-guide view counted", pv && pv.n >= 1 && pv.pages.includes("price-guide"), JSON.stringify(pv));
  await page.goto(`${base}/assessment`);
  await page.fill("#first_name", "Kwame"); await page.fill("#last_name", "Mensah"); await page.fill("#email", "kwame@example.com"); await page.fill("#phone", "+1 617 555 0100");
  await page.selectOption("#current_country", "US");
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  await page.selectOption("#ghana_region", "Greater Accra"); await page.fill("#ghana_city", "East Legon");
  await page.locator('input[name="land_status"][value="owned_documented"]').check();
  await page.locator('input[name="project_stage"][value="land_only"]').check();
  await page.locator('input[name="construction_type"][value="single_family"]').check();
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  ok("project type pre-selected from construction type", (await page.getByTestId("q-project_type-single_family").getAttribute("aria-pressed")) === "true");
  await page.getByTestId("q-size-3bed").click(); await page.getByTestId("q-add_ons-bq").click(); await page.getByTestId("q-add_ons-wall").click();
  const range = await page.getByTestId("typical-range").innerText();
  ok("typical range shown", range.includes("$80k–$175k"), range);
  await page.getByTestId("q-budget-100k_200k").click(); await page.getByTestId("q-start-3_6m").click();
  await page.fill('[data-testid="q-preferred_date"]', date); await page.selectOption('[data-testid="q-preferred_window"]', "1800");
  await page.getByTestId("q-favorites-modern_flat").click();
  await page.getByText("Owner's representation & inspections", { exact: true }).click();
  await page.screenshot({ path: "/tmp/shot-buildghana-qualifiers.png" });
  await page.getByRole("button", { name: "Continue" }).click(); await slow(page);
  await page.locator('input[name="consent_contact"]').check(); await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Request My Assessment" }).click();
};
if (want("buildghana")) await run("buildghana", 3101, `localStorage.setItem("bga_consent",JSON.stringify({analytics:true,ads:true}))`, flow_buildghana);

/* ---- consent declined: no pixel conversion, no server event ---- */
async function declined(name, port, init, flow) {
  const before = mockLines().length;
  const browser = await launch();
  const ctx = await browser.newContext();
  await ctx.route("https://bzrcdn.openai.com/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ctx.route(/googletagmanager|facebook|challenges\.cloudflare/, (r) => r.abort());
  await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const out = { site: `${name} (ads consent declined)`, checks: [] };
  try {
    await flow(page, `http://127.0.0.1:${port}`, noop);
    await page.waitForURL(/thank-you/, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const calls = await page.evaluate(() => window.__oaiq || []);
    const consent = calls.find((c) => c[0] === "consent");
    out.checks.push({ label: "pixel consent=false before init", pass: consent?.[1] === false, detail: JSON.stringify(consent) });
    out.checks.push({ label: "no lead_created measure in browser", pass: !calls.some((c) => c[0] === "measure"), detail: "" });
    const capi = mockLines().slice(before).filter((r) => r.url.startsWith("/v1/events"));
    out.checks.push({ label: "no Conversions API call", pass: capi.length === 0, detail: String(capi.length) });
  } catch (e) { out.checks.push({ label: "flow completed", pass: false, detail: String(e).slice(0, 300) }); }
  await browser.close();
  results.push(out);
}
if (want("deckcraft")) await declined("deckcraft", 3102, `localStorage.setItem("dc_consent_v1","denied")`, async (page, base) => {
  await page.goto(`${base}/contact`);
  await page.fill("#first_name", "Decline"); await page.fill("#email", "decline@example.com"); await page.fill("#phone", "6175550111");
  await page.fill("#town", "Boston"); await page.getByRole("checkbox", { name: "Deck repair" }).first().click();
  await page.getByTestId("q-project_type-deck_repair").click(); await page.getByTestId("q-size-medium").click(); await page.getByTestId("q-budget-2_5_5k").click(); await page.getByTestId("q-start-asap").click();
  await page.waitForTimeout(2600); await page.getByRole("button", { name: /Send My Photos/ }).click();
});
if (want("portfolioworks")) await declined("portfolioworks", 3103, `localStorage.setItem("pw_consent","denied")`, async (page, base) => {
  await page.goto(`${base}/unit-turn-estimator`);
  await page.getByRole("button", { name: /Submit this unit for a written scope/ }).click();
  const form = page.getByTestId("lead-form");
  await form.locator('select[name="customerType"]').selectOption("landlord"); await page.getByTestId("form-next").click();
  await page.fill("#zip", "02139"); await page.getByTestId("form-next").click();
  await page.getByTestId("q-size-light").click(); await page.getByTestId("q-budget-unsure").click(); await page.getByTestId("q-start-planning").click();
  await page.getByTestId("form-next").click();
  await page.fill("#fn", "No"); await page.fill("#ln", "Ads"); await page.fill("#em", "noads@example.com"); await page.fill("#pn", "617-555-0100");
  await form.locator('input[name="consentContact"]').check(); await page.waitForTimeout(2600); await page.getByTestId("form-next").click();
});

if (want("buildghana")) await declined("buildghana", 3101, `localStorage.setItem("bga_consent",JSON.stringify({analytics:true,ads:false}))`, flow_buildghana);
if (want("stonecraft")) await declined("stonecraft", 3104, `localStorage.setItem("sc_consent_v1",JSON.stringify({analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"}))`, flow_stonecraft);

/* ---- CRM stage webhooks → OpenAI events ---- */
async function crm(name, port, path, header, body, expectType) {
  const before = mockLines().length;
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "Content-Type": "application/json", [header]: "whsec_e2e_123" }, body: JSON.stringify(body) });
  await new Promise((res) => setTimeout(res, 600));
  const ev = mockLines().slice(before).filter((x) => x.url.startsWith("/v1/events")).map((x) => JSON.parse(x.body).events[0])[0];
  results.push({ site: `${name} CRM webhook`, checks: [{ label: `stage → ${expectType}`, pass: r.ok && ev && (ev.type === expectType || ev.custom_event_name === expectType), detail: `${r.status} ${JSON.stringify(ev)?.slice(0, 200)}` }] });
}
if (want("deckcraft")) await crm("deckcraft", 3102, "/api/crm-webhook", "x-dc-secret", { stage: "estimate_booked", lead_id: "lead_1", opportunity_id: "opp_1", email: "a@example.com" }, "appointment_scheduled");
if (want("deckcraft")) await crm("deckcraft", 3102, "/api/crm-webhook", "x-dc-secret", { stage: "won", lead_id: "lead_1", opportunity_id: "opp_1", email: "a@example.com", value: 28500 }, "job_won");
if (want("stonecraft")) await crm("stonecraft", 3104, "/api/crm/webhook", "x-sc-webhook-secret", { stage: "Estimate Scheduled", opportunityId: "o_2", email: "b@example.com" }, "appointment_scheduled");
if (want("portfolioworks")) await crm("portfolioworks", 3103, "/api/crm-webhook", "x-pw-webhook-secret", { stage: "site_walk_booked", eventId: "evt_missing", email: "c@example.com" }, "appointment_scheduled");
if (want("buildghana")) await crm("buildghana", 3101, "/api/crm-webhook", "x-webhook-secret", { event: "contract_signed", lead_id: "lead_xyz_1", email: "d@example.com", value: 120000 }, "job_won");

/* ---- health endpoints (booleans only, no secrets) ---- */
for (const [name, port] of [["buildghana", 3101], ["deckcraft", 3102], ["portfolioworks", 3103], ["stonecraft", 3104]]) {
  if (!want(name)) continue;
  const r = await fetch(`http://127.0.0.1:${port}/api/health`).catch((e) => ({ ok: false, status: String(e) }));
  const j = r.ok ? await r.json() : null;
  results.push({ site: `${name} health`, checks: [{ label: "/api/health 200 with configured flags", pass: Boolean(r.ok && j && j.configured), detail: String(r.status) }] });
}

fs.writeFileSync("/tmp/e2e-results.json", JSON.stringify(results, null, 2));
let fails = 0;
for (const r of results) {
  console.log(`\n== ${r.site}${r.brief ? `  [email: ${r.brief}]` : ""}`);
  for (const c of r.checks) { if (!c.pass) fails++; console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.label}${c.pass ? "" : `  -> ${c.detail}`}`); }
}
console.log(`\n${fails ? fails + " FAILED" : "ALL PASSED"}`);
process.exit(fails ? 1 : 0);
