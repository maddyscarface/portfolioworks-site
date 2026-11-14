// Scans prerendered public HTML (visible text + JSON-LD) for price figures. Usage: node tests/tools/price-scan.mjs [dir]
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const root = process.argv[2] ?? ".next/server/app";
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && !p.includes("admin") && files.push(p); } })(root);
const PRICE = /\$\s?\d|\d\s?(usd|dollars)\b|per (sq\.? ?ft|square foot|linear (ft|foot))[^.]{0,15}\d|\d[\d,.]*\s?(\/|per)\s?(sq\.? ?ft|linear)/i;
let hits = 0;
for (const f of files) {
  const html = readFileSync(f, "utf8");
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(" ");
  const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;|&quot;|&amp;/g, " ") + " " + ld;
  for (const m of text.matchAll(new RegExp(PRICE.source, "gi"))) {
    // Allowlisted legal fact, not a price: Maine Home Construction Contracts Act threshold.
    if (/contracts with specific terms for residential jobs over \$3,000/.test(text.slice(Math.max(0, m.index - 80), m.index + 10))) continue;
    hits++; console.log(`${f}: …${text.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, " ")}…`); }
}
console.log(`${files.length} public pages scanned, ${hits} price-like hits`);
process.exit(hits ? 1 : 0);
