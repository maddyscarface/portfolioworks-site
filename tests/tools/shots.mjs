import { chromium } from "playwright";
const [,, base, outDir, ...paths] = process.argv;
const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
for (const [w,h,tag] of [[390,844,"m390"],[1440,900,"d1440"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const path of paths) {
    try { await p.goto(base + path, { waitUntil: "networkidle", timeout: 45000 }); } catch (e) { console.log("goto fail", path, e.message); }
    const name = (path === "/" ? "home" : path.replace(/^\//, "").replace(/[\/?=&]/g, "_"));
    await p.screenshot({ path: `${outDir}/${tag}-${name}.png`, fullPage: true });
    console.log("shot", tag, path);
  }
  await ctx.close();
}
await b.close();
