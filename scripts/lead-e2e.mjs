import { chromium } from "playwright";
const BASE = process.argv[2] || "http://127.0.0.1:4317";
const fails = [];
const check = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails.push(msg); };

{
  const r = await fetch(BASE + "/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check(r.status >= 400, `empty lead POST -> ${r.status} (expect 4xx)`);
}

const funnels = [
  { path: "/request-a-turnover", name: "turnover", service: "Rental turnover / make-ready" },
  { path: "/request-a-renovation-estimate", name: "rehab", service: "Full or partial renovation" },
  { path: "/portfolio-programs#consultation", name: "portfolio", service: "Recurring maintenance / partner program" },
];

const browser = await chromium.launch();

async function completeForm(page, f) {
  const form = page.locator("[data-testid=lead-form]").first();
  await form.waitFor({ state: "visible" });
  const typeSelect = form.locator("select[name=customerType]");
  await typeSelect.selectOption("landlord");
  const pressed = form.locator("button.chip[aria-pressed=true]");
  if ((await pressed.count()) === 0) {
    const chip = form.locator("button.chip", { hasText: /turnover|renovation|maintenance|paint|partner/i }).first();
    if (await chip.count()) await chip.click();
    else await form.locator("button.chip").first().click();
  }
  await page.waitForTimeout(2600);
  const next = form.locator("[data-testid=form-next]");
  await next.waitFor({ state: "visible" });
  if (await next.isDisabled()) throw new Error(`${f.name} step 0 still disabled after filling type+service`);
  await next.click();

  const zip = form.locator("input[name=zip]");
  await zip.waitFor({ state: "visible" });
  await zip.fill("02143");
  const units = form.locator("input[name=units]");
  if (await units.count()) await units.fill("12");
  const desc = form.locator("#desc");
  if (await desc.count()) await desc.fill("2BR, needs paint and LVP — Phase 3 e2e, not a live inquiry.");
  await next.click();

  // Budget & walkthrough qualifiers (skipped on portfolio)
  const quals = form.locator("[data-testid=estimate-qualifiers]");
  if (await quals.count()) {
    const pick = async (testId) => {
      const el = form.locator(`[data-testid="${testId}"]`);
      if (await el.count()) await el.click();
    };
    if (!(await form.locator('[data-testid=q-project_type-turnover][aria-pressed=true], [data-testid=q-project_type-rehab][aria-pressed=true], [data-testid^="q-project_type-"][aria-pressed=true]').count())) {
      if (await form.locator('[data-testid=q-project_type-turnover]').count()) await pick("q-project_type-turnover");
      else await form.locator('[data-testid^="q-project_type-"]').first().click();
    }
    const size = form.locator('[data-testid^="q-size-"]').first();
    await size.click();
    await pick("q-budget-unsure");
    await pick("q-start-planning");
    await next.click();
  }

  await form.locator("input[name=firstName]").fill("Test");
  await form.locator("input[name=lastName]").fill("Landlord");
  await form.locator("input[name=email]").fill(`phase3-${f.name}@example.com`);
  await form.locator("input[name=phone]").fill("617-555-0199");
  const consent = form.locator("input[name=consentContact]");
  if (await consent.count()) await consent.check();
  await next.click();
}

for (const f of funnels) {
  const page = await browser.newPage();
  const leads = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/leads") && res.request().method() === "POST") {
      leads.push({ status: res.status(), body: await res.text().catch(() => "") });
    }
  });
  await page.goto(BASE + f.path, { waitUntil: "networkidle" });
  const accept = page.getByRole("button", { name: /accept/i });
  if (await accept.count()) await accept.first().click().catch(() => {});
  check(await page.locator("[data-testid=lead-form]").count() > 0, `${f.name} form present`);
  try {
    await completeForm(page, f);
    await page.waitForURL("**/thank-you**", { timeout: 15000 });
    check(true, `${f.name} reached thank-you`);
  } catch (e) {
    check(false, `${f.name} failed: ${e.message} lastLead=${JSON.stringify(leads.slice(-1))} url=${page.url()}`);
  }
  if (leads.length) check(leads.every((l) => l.status < 500), `${f.name} lead POST status ${leads.map((l) => l.status).join(",")}`);
  await page.close();
}
await browser.close();
console.log(fails.length ? `${fails.length} FAIL(S)` : "LEAD E2E PASSED");
process.exit(fails.length ? 1 : 0);
