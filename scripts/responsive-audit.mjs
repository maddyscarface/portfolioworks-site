/**
 * Responsive + favicon audit.
 * Usage: node scripts/responsive-audit.mjs http://127.0.0.1:PORT
 * Viewports: 320, 360, 390, 414, 768, 834, 1024, 1280, 1440, 1920, and 844x390.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:4317";
const PAGES = [
  "/",
  "/rental-turnovers",
  "/rental-renovations",
  "/portfolio-programs",
  "/home-renovations",
  "/unit-turn-estimator",
  "/request-a-turnover",
  "/resources",
  "/resources/what-is-included-in-a-rental-unit-turnover",
  "/service-areas",
  "/contact",
];
const VIEWPORTS = [
  { w: 320, h: 720, name: "320" },
  { w: 360, h: 740, name: "360" },
  { w: 390, h: 844, name: "390" },
  { w: 414, h: 896, name: "414" },
  { w: 768, h: 1024, name: "768" },
  { w: 834, h: 1112, name: "834" },
  { w: 1024, h: 768, name: "1024" },
  { w: 1280, h: 800, name: "1280" },
  { w: 1440, h: 900, name: "1440" },
  { w: 1920, h: 1080, name: "1920" },
  { w: 844, h: 390, name: "844x390" },
];
const ICONS = [
  "/favicon.ico",
  "/icon.svg",
  "/icon-32.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/site.webmanifest",
  "/manifest.webmanifest",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
];

const fails = [];
const notes = [];
const pass = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) fails.push(msg);
};

const iconResults = [];
for (const path of ICONS) {
  const res = await fetch(BASE + path);
  const type = res.headers.get("content-type") || "";
  iconResults.push({ path, status: res.status, type });
  pass(res.status === 200, `${path} -> ${res.status} (${type})`);
}

const browser = await chromium.launch();
const isMobileWidth = (w) => w < 1280; // hamburger only below xl

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  for (const route of PAGES) {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
    const metrics = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      const overflow = docW - clientW;
      const tooSmall = [];
      const selectors = "a.btn, button, .chip, .mobile-menu summary, input, select, textarea, [data-testid=form-next]";
      document.querySelectorAll(selectors).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        if (r.height + 0.5 < 44 || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT" && r.width + 0.5 < 44)) {
          tooSmall.push({
            tag: el.tagName.toLowerCase(),
            text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      });
      const sizes = [];
      const sample = document.querySelector("main") || document.body;
      const walk = sample.innerText || "";
      const bodySize = parseFloat(getComputedStyle(document.body).fontSize);
      return { overflow, bodySize, tooSmall, textLen: walk.length };
    });
    pass(metrics.overflow <= 1, `${vp.name} ${route} overflow ${metrics.overflow}px (body font ${metrics.bodySize}px)`);
    if (metrics.bodySize < 14) notes.push(`${vp.name} ${route} body font ${metrics.bodySize}px`);
    // Tap targets: on compact desktop widths, ignore visually hidden desktop-only controls
    const relevant = metrics.tooSmall.filter((t) => t.h < 44 || (vp.w < 1280 && t.tag !== "a"));
    if (metrics.tooSmall.length) {
      const msg = `${vp.name} ${route} tap-targets <44px: ${JSON.stringify(metrics.tooSmall.slice(0, 8))}`;
      // inputs/selects must be 44px; text links in body copy are allowed to be inline
      const blockers = metrics.tooSmall.filter((t) => t.tag === "button" || t.tag === "summary" || t.tag === "input" || t.tag === "select" || t.tag === "textarea" || (t.tag === "a" && /btn|chip|menu/i.test(t.text + t.tag)));
      if (blockers.length) pass(false, `${vp.name} ${route} control tap-targets <44px: ${JSON.stringify(blockers.slice(0, 6))}`);
      else notes.push(msg);
    }
  }
  // Mobile nav at widths below xl (1280)
  if (isMobileWidth(vp.w)) {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const menu = page.locator(".mobile-menu summary");
    const visible = await menu.isVisible();
    pass(visible, `${vp.name} mobile menu visible`);
    if (visible) {
      await menu.click();
      const open = await page.locator("nav[aria-label=Mobile]").isVisible();
      pass(open, `${vp.name} mobile menu opens`);
      const turnover = page.locator("nav[aria-label=Mobile] a[href='/rental-turnovers']");
      pass(await turnover.isVisible(), `${vp.name} mobile nav has Turnovers`);
      await turnover.click();
      await page.waitForURL("**/rental-turnovers**", { timeout: 10000 });
      pass(true, `${vp.name} mobile nav navigates to /rental-turnovers`);
    }
  } else {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const desktop = await page.locator("nav[aria-label=Primary]").isVisible();
    pass(desktop, `${vp.name} desktop primary nav visible`);
    const hamburger = await page.locator(".mobile-menu summary").isVisible();
    pass(!hamburger, `${vp.name} hamburger hidden`);
  }
  await context.close();
}
await browser.close();

if (notes.length) {
  console.log("\nNOTES (non-blocking):");
  for (const n of notes) console.log(" -", n);
}
console.log(fails.length ? `\n${fails.length} FAIL(S)` : "\nALL CHECKS PASSED");
process.exit(fails.length ? 1 : 0);
