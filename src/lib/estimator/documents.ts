import { zip } from "./zip";

/**
 * Private proposal documents (owner export only, never sent by the system). The customer document shows scope and
 * the owner-approved total only; internal rates, cost, waste and margin are never written into it.
 */
export type ProposalDoc = {
  title: string; brand: string; email: string; preparedFor: string; location: string; date: string; reference: string;
  scope: { description: string; quantity: string }[]; scopeText: string; exclusions: string;
  priceLines: { label: string; amount: string }[]; footer: string[];
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const para = (t: string, opts: { bold?: boolean; size?: number } = {}) =>
  `<w:p><w:r><w:rPr>${opts.bold ? "<w:b/>" : ""}${opts.size ? `<w:sz w:val="${opts.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const row = (cells: string[], bold = false) => `<w:tr>${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>${para(c, { bold })}</w:tc>`).join("")}</w:tr>`;
const table = (rows: string[][], header?: string[]) =>
  `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="2"/></w:tblBorders></w:tblPr>${header ? row(header, true) : ""}${rows.map((r) => row(r)).join("")}</w:tbl>`;

export function renderDocx(d: ProposalDoc): Buffer {
  const body = [
    para(d.brand, { bold: true, size: 32 }), para(d.title, { bold: true, size: 28 }),
    para(`Prepared for: ${d.preparedFor}`), para(`Location: ${d.location}`), para(`Date: ${d.date}`), para(`Reference: ${d.reference}`), para(""),
    para("Scope of work", { bold: true, size: 24 }), ...d.scopeText.split("\n").filter(Boolean).map((t) => para(t)),
    d.scope.length ? table(d.scope.map((s) => [s.description, s.quantity]), ["Item", "Quantity"]) : "", para(""),
    para("Price", { bold: true, size: 24 }), table(d.priceLines.map((p) => [p.label, p.amount])), para(""),
    para("Exclusions and assumptions", { bold: true, size: 24 }), ...d.exclusions.split("\n").filter(Boolean).map((t) => para(t)), para(""),
    ...d.footer.map((t) => para(t)), para(`Questions: ${d.email}`),
  ].join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200"/></w:sectPr></w:body></w:document>`;
  return zip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: document },
  ]);
}

/** Minimal multi-page PDF (Helvetica, WinAnsi-safe ASCII). */
export function renderPdf(d: ProposalDoc): Buffer {
  const ascii = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u00d7/g, "x").replace(/[^\x20-\x7e]/g, "");
  const pdfEsc = (s: string) => ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const wrap = (s: string, n = 92) => { const out: string[] = []; for (const para of ascii(s).split("\n")) { let line = ""; for (const w of para.split(" ")) { if ((line + " " + w).trim().length > n) { out.push(line); line = w; } else line = (line + " " + w).trim(); } out.push(line); } return out; };
  const lines: { t: string; size: number; bold?: boolean }[] = [];
  const add = (t: string, size = 10, bold = false) => wrap(t).forEach((x) => lines.push({ t: x, size, bold }));
  add(d.brand, 16, true); add(d.title, 13, true); add(`Prepared for: ${d.preparedFor}`); add(`Location: ${d.location}`); add(`Date: ${d.date}`); add(`Reference: ${d.reference}`); add("");
  add("Scope of work", 12, true); d.scopeText.split("\n").filter(Boolean).forEach((t) => add(t)); d.scope.forEach((s) => add(`- ${s.description}: ${s.quantity}`)); add("");
  add("Price", 12, true); d.priceLines.forEach((p) => add(`${p.label}: ${p.amount}`)); add("");
  add("Exclusions and assumptions", 12, true); d.exclusions.split("\n").filter(Boolean).forEach((t) => add(t)); add("");
  d.footer.forEach((t) => add(t)); add(`Questions: ${d.email}`);
  const perPage = 52; const pages: typeof lines[] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const kids: string[] = [];
  pages.forEach((pg, i) => {
    const pageId = 5 + i * 2; const contentId = pageId + 1; kids.push(`${pageId} 0 R`);
    let y = 750; const ops = ["BT"];
    for (const l of pg) { ops.push(`/${l.bold ? "F2" : "F1"} ${l.size} Tf 1 0 0 1 56 ${y} Tm (${pdfEsc(l.t)}) Tj`); y -= l.size + 4; }
    ops.push("ET");
    const stream = ops.join("\n");
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objs[contentId] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });
  objs[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  let out = "%PDF-1.4\n"; const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) { offsets[i] = Buffer.byteLength(out); out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
