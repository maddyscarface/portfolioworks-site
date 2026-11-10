/**
 * Team lead brief email ("New estimate request"). Everything the team needs to win the job:
 * requested time + add-to-calendar, budget / start / saw-pricing tiles, the project, favourite
 * past work, offer guidance, and the customer's contact details.
 *
 * Email-client safe: tables + inline styles, no external CSS, every value HTML-escaped.
 */
import { budgetFit, calendarLink, formatVisitDate, labelOf, rangeText, type EstimateConfig, type Qualifiers } from "./qualifiers";

export type BriefTheme = { dark: string; accent: string; accentSoft: string; ink: string; muted: string };

export type BriefInput = {
  cfg: EstimateConfig;
  theme: BriefTheme;
  heading?: string; // e.g. "New deck estimate request"
  name: string;
  phone?: string;
  email?: string;
  /** Used when the qualifiers did not include an address. */
  location?: string;
  q?: Qualifiers;
  /** Extra project lines from the site's own form (services, material, notes…). */
  details?: [string, string | undefined][];
  photoUrls?: string[];
  score?: number | string;
  source?: string;
  adminUrl?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

export function projectSummary(cfg: EstimateConfig, q?: Qualifiers) {
  if (!q?.project_type) return undefined;
  const pt = cfg.projectTypes.find((p) => p.id === q.project_type);
  if (!pt) return undefined;
  const size = labelOf(pt.sizes, q.size);
  const adds = (q.add_ons ?? []).map((a) => labelOf(pt.addOns ?? [], a)).filter(Boolean);
  const lower = (x: string) => (/^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);
  return [size ? `${pt.label}, ${lower(size)}` : pt.label, ...adds.map((a) => lower(a!))].join(" + ");
}

export function renderLeadBrief(b: BriefInput) {
  const { cfg, theme: T, q } = b;
  const fit = q ? budgetFit(cfg, q) : undefined;
  const win = cfg.timeWindows.find((w) => w.id === q?.preferred_window);
  const project = projectSummary(cfg, q);
  const favs = (q?.favorites ?? []).map((f) => labelOf(cfg.favorites.options, f)).filter(Boolean) as string[];
  const address = q?.address || b.location;
  const sawPricing = q?.saw_pricing === undefined ? "Unknown" : q.saw_pricing ? `Yes · viewed ${q.pricing_views ?? 1}×` : "No";
  const heading = b.heading ?? `New ${cfg.visitLabel} request`;
  const cal = q ? calendarLink(cfg, { ...q, address }, `${cfg.brand}: ${b.name}${project ? ` (${project})` : ""}`,
    [`Phone: ${b.phone ?? ""}`, `Email: ${b.email ?? ""}`, project && `Project: ${project}`, fit?.band && `Budget: ${fit.band.label}`, fit && `Offer: ${fit.guidance}`].filter(Boolean).join("\n")) : undefined;

  const tile = (label: string, value: string) => `<td width="33%" valign="top" style="padding:0 6px"><div style="border:1px solid #e6e1d8;border-top:4px solid ${T.accent};border-radius:10px;padding:14px 16px;background:#fff">
<div style="font:700 11px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${T.muted}">${esc(label)}</div>
<div style="font:800 20px/1.25 Arial,sans-serif;color:${T.ink};margin-top:8px">${esc(value)}</div></div></td>`;
  const row = (k: string, v?: string, html?: string) => (v || html) ? `<tr><td style="padding:12px 16px;border-top:1px solid #eee;color:${T.muted};font:14px Arial,sans-serif;width:36%">${esc(k)}</td><td style="padding:12px 16px;border-top:1px solid #eee;color:${T.ink};font:600 15px Arial,sans-serif">${html ?? esc(v)}</td></tr>` : "";

  const fitColor = fit?.fit === "below" ? "#b42318" : fit?.fit === "low_end" ? "#b54708" : "#067647";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2ee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:16px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${T.dark};padding:28px 28px 26px;border-bottom:5px solid ${T.accent}">
  <span style="display:inline-block;background:${T.accent};color:${T.dark};font:800 12px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:9px 16px;border-radius:999px">● ${esc(heading)}</span>
  <h1 style="margin:18px 0 8px;font:800 34px/1.1 Arial,sans-serif;color:#fff">${esc(b.name)}</h1>
  <p style="margin:0 0 20px;font:16px/1.5 Arial,sans-serif;color:#d7dde4">A customer in your service area wants ${esc(cfg.visitLabel === "estimate visit" ? "an estimate" : `a ${cfg.visitLabel}`)}. Everything you need to win it is below.</p>
  ${q?.preferred_date ? `<div style="border:1px solid rgba(255,255,255,.18);border-left:4px solid ${T.accent};border-radius:10px;padding:18px 20px;background:rgba(255,255,255,.04)">
    <div style="font:800 11px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${T.accent}">Requested time</div>
    <div style="font:800 24px/1.3 Arial,sans-serif;color:#fff;margin-top:8px">${esc(formatVisitDate(q.preferred_date))}</div>
    <div style="font:15px/1.4 Arial,sans-serif;color:#d7dde4"><b style="color:#fff">${esc(win?.label ?? "Any time")}</b> · ${esc(cfg.tzLabel)}</div>
    ${cal ? `<a href="${esc(cal)}" style="display:inline-block;margin-top:14px;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:10px 16px;color:#fff;font:700 14px Arial,sans-serif;text-decoration:none">📅 Add to calendar</a>` : ""}
  </div>` : `<div style="font:14px Arial,sans-serif;color:#d7dde4">No visit time requested. Call to book.</div>`}
</td></tr>
<tr><td style="padding:22px 22px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  ${tile("Budget", fit?.band?.label ?? "Not given")}${tile("Start", labelOf(cfg.startOptions, q?.start) ?? "Not given")}${tile("Saw pricing", sawPricing)}
</tr></table></td></tr>
${project || b.details?.some(([, v]) => v) ? `<tr><td style="padding:16px 28px 0"><div style="background:${T.accentSoft};border:1px solid #efe3cf;border-radius:10px">
  <div style="padding:16px 18px">
    <div style="font:800 11px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${T.accent}">The project</div>
    ${project ? `<div style="font:800 22px/1.3 Arial,sans-serif;color:${T.ink};margin-top:8px">${esc(project)}</div>` : ""}
    ${fit?.typical ? `<div style="font:14px Arial,sans-serif;color:${T.muted};margin-top:6px">Typical range for this scope: <b style="color:${T.ink}">${esc(rangeText(fit.typical))}</b>${cfg.rangesConfirmed ? "" : " (placeholder ranges, confirm in config)"}</div>` : ""}
    ${(b.details ?? []).filter(([, v]) => v).map(([k, v]) => `<div style="font:14px Arial,sans-serif;color:${T.ink};margin-top:6px"><span style="color:${T.muted}">${esc(k)}:</span> ${esc(v)}</div>`).join("")}
  </div>
  ${favs.length ? `<div style="border-top:1px solid #efe3cf;padding:12px 18px"><div style="font:13px Arial,sans-serif;color:${T.muted}"><span style="color:${T.accent}">★</span> ${esc(cfg.favorites.prompt.replace(/\?$/, ""))}</div><div style="font:700 16px Arial,sans-serif;color:${T.ink};margin-top:4px">${esc(favs.join(" + "))}</div></div>` : ""}
</div></td></tr>` : ""}
${fit ? `<tr><td style="padding:14px 28px 0"><div style="border-left:4px solid ${fitColor};background:#fafafa;border-radius:6px;padding:12px 14px;font:14px/1.5 Arial,sans-serif;color:${T.ink}"><b style="color:${fitColor}">How to shape the offer:</b> ${esc(fit.guidance)}</div></td></tr>` : ""}
<tr><td style="padding:22px 28px 8px"><div style="font:800 18px Arial,sans-serif;color:${T.ink};margin-bottom:10px">The customer</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:10px;border-collapse:separate">
  ${row("Name", b.name).replace("border-top:1px solid #eee;", "").replace("border-top:1px solid #eee;", "")}
  ${row("Phone", undefined, b.phone ? `<a href="${esc(telHref(b.phone))}" style="color:${T.ink};text-decoration:none">${esc(b.phone)}</a>` : undefined)}
  ${row("Email", undefined, b.email ? `<a href="mailto:${esc(b.email)}" style="color:${T.ink};font-weight:400">${esc(b.email)}</a>` : undefined)}
  ${row("Address", address)}
</table></td></tr>
<tr><td style="padding:12px 28px 26px;font:13px/1.6 Arial,sans-serif;color:${T.muted}">
  ${b.photoUrls?.length ? `Photos: ${b.photoUrls.map((u, i) => `<a href="${esc(u)}" style="color:${T.ink}">${i + 1}</a>`).join(" · ")}<br>` : ""}
  ${b.score !== undefined ? `Lead score: ${esc(b.score)} · ` : ""}Source: ${esc(b.source ?? "direct")}${b.adminUrl ? ` · <a href="${esc(b.adminUrl)}" style="color:${T.ink}">Open in admin</a>` : ""}
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `${heading.toUpperCase()}: ${b.name}`,
    q?.preferred_date ? `Requested: ${formatVisitDate(q.preferred_date)}, ${win?.label ?? "any time"} (${cfg.tzLabel})` : "Requested: no time given",
    `Budget: ${fit?.band?.label ?? "not given"} | Start: ${labelOf(cfg.startOptions, q?.start) ?? "not given"} | Saw pricing: ${sawPricing}`,
    project && `Project: ${project}${fit?.typical ? ` (typical ${rangeText(fit.typical)})` : ""}`,
    ...(b.details ?? []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    favs.length ? `Favourites: ${favs.join(" + ")}` : undefined,
    fit && `Offer: ${fit.guidance}`,
    `Phone: ${b.phone ?? "-"} | Email: ${b.email ?? "-"}`,
    address && `Address: ${address}`,
    cal && `Add to calendar: ${cal}`,
  ].filter(Boolean).join("\n");

  const subject = `${heading}: ${b.name}${project ? ` · ${project}` : ""}${fit?.band ? ` · ${fit.band.label}` : ""}`;
  return { subject, html, text };
}

/** Sends via Resend when RESEND_API_KEY + a sender + recipients are configured. Never throws. */
export async function sendLeadBrief(brief: ReturnType<typeof renderLeadBrief>, opts: { to?: string; from?: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = (opts.to ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !opts.from || !to.length) return { sent: false, reason: "not configured" };
  try {
    // RESEND_API_BASE is for local end-to-end tests only (points at a mock). Leave unset in production.
    const r = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: opts.from, to, subject: brief.subject, html: brief.html, text: brief.text, reply_to: opts.replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    return { sent: r.ok, status: r.status };
  } catch (e) {
    return { sent: false, reason: String(e).slice(0, 200) };
  }
}
