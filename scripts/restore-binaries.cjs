// Restores binary assets stored as base64 (*.b64) — the repo was pushed through a text-only API.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const skip = new Set(["node_modules", ".next", ".git"]);
let n = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".b64")) {
      const out = p.slice(0, -4);
      fs.writeFileSync(out, Buffer.from(fs.readFileSync(p, "utf8").replace(/\s+/g, ""), "base64"));
      n++;
    }
  }
})(root);
console.log(`restore-binaries: wrote ${n} file(s)`);
