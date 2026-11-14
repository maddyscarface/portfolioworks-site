import { emailHash } from "../p4/ids";

/**
 * CSV importer for DataMoon exports (or the synthetic fixture). Dry-run by default: returns accepted / rejected /
 * duplicate / suppressed rows without writing. Imported vendor prospects are kept separate from first-party leads and
 * customers, with field-level provenance; they are never silently merged into a lead.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const CONTACT_ID = /^id_[0-9a-f]{16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Columns we keep. Phone numbers and sensitive/financial columns are dropped at import (no SMS/TCPA basis). */
const KEEP = ["contact_id", "first_name", "last_name", "personal_emails", "business_email", "personal_city", "personal_state", "personal_zip", "company_name", "job_title", "topic", "score_category"] as const;

export type ImportedContact = {
  contact_id: string; email: string | null; email_hash: string | null; first_name: string | null; last_name: string | null; city: string | null; state: string | null; zip: string | null;
  company_name: string | null; job_title: string | null; topic: string | null; score_category: string | null;
  provenance: Record<string, "DataMoon">; status: "prospect" | "suppressed";
};

export function importCsv(text: string, opts: { suppressedHashes: Set<string>; existingContactIds: Set<string>; existingEmailHashes?: Set<string>; firstPartyEmailHashes?: Set<string> }) {
  const rows = parseCsv(text);
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const accepted: ImportedContact[] = []; const rejected: { line: number; reason: string }[] = []; const duplicates: string[] = []; const suppressed: string[] = []; const possibleFirstPartyMatches: string[] = [];
  const seenIds = new Set(opts.existingContactIds); const seenEmails = new Set(opts.existingEmailHashes ?? []);
  if (idx("contact_id") < 0) return { accepted, rejected: [{ line: 1, reason: "missing contact_id column" }], duplicates, suppressed, possibleFirstPartyMatches, dropped_columns: header };
  const dropped = header.filter((h) => !(KEEP as readonly string[]).includes(h));
  rows.forEach((r, i) => {
    const get = (k: string) => { const j = idx(k); const v = j >= 0 ? (r[j] ?? "").trim() : ""; return v || null; };
    const line = i + 2;
    const cid = get("contact_id");
    if (!cid || !CONTACT_ID.test(cid)) { rejected.push({ line, reason: "invalid contact_id" }); return; }
    const rawEmail = (get("personal_emails") ?? get("business_email"))?.split(/[|,;]/)[0]?.trim().toLowerCase() ?? null;
    const email = rawEmail && EMAIL.test(rawEmail) ? rawEmail : null;
    const eh = emailHash(email);
    if (seenIds.has(cid) || (eh && seenEmails.has(eh))) { duplicates.push(cid); return; }
    seenIds.add(cid); if (eh) seenEmails.add(eh);
    const c: ImportedContact = {
      contact_id: cid, email, email_hash: eh, first_name: get("first_name"), last_name: get("last_name"), city: get("personal_city"), state: get("personal_state"), zip: get("personal_zip"),
      company_name: get("company_name"), job_title: get("job_title"), topic: get("topic"), score_category: get("score_category"), provenance: {}, status: "prospect",
    };
    for (const k of Object.keys(c)) if (!["provenance", "status", "email_hash"].includes(k) && (c as Record<string, unknown>)[k] !== null) c.provenance[k] = "DataMoon";
    if (eh && opts.suppressedHashes.has(eh)) { c.status = "suppressed"; suppressed.push(cid); }
    if (eh && opts.firstPartyEmailHashes?.has(eh)) possibleFirstPartyMatches.push(cid); // flagged for staff review, never auto-merged
    accepted.push(c);
  });
  return { accepted, rejected, duplicates, suppressed, possibleFirstPartyMatches, dropped_columns: dropped };
}
