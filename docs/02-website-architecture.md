# 02 — Website Architecture & Page Inventory

All copy lives in code/config so it can be edited in one place:
- `src/config/site.ts` — brand lines, CTAs, founder bio, per-market credentials (null = hidden)
- `src/config/services.ts` — the 11 services: overview, problem, scope, deliverables, process, pricing framework, form fields, CTA, FAQ, upsells, SEO meta
- `src/config/audiences.ts` — 6 ICP pathways with separate copy, CTAs and form variants
- `src/config/markets.ts` — 3 markets: status, towns (served flag), licensing notes, price multiplier, calendar/pipeline env keys, sales territory, ZIP prefixes
- `src/config/funnels.ts` — 5 paid-traffic landing pages
- `src/config/pricing.ts` — estimator price sheet (placeholder values)
- `src/config/seo-briefs.ts` — 20 content briefs

## Routes (all built)
| Route | Purpose | Form / funnel |
|---|---|---|
| `/` | 17-section homepage (hero, credibility, pains, full vs. à la carte, pathways, catalog, process, sample scopes, portfolio program, estimator, gallery, portal preview, comparison, founder, case-study format, FAQ, lead form, footer) | walkthrough |
| `/rental-turnovers` | Turnover service page | turnover |
| `/landlords` `/portfolio-owners` `/property-managers` `/real-estate-investors` (+ `#brokers`) `/hoa-condos` | ICP pages | variant per ICP |
| `/general-contracting` | Contract structures, change-order control, credentials | — |
| `/services` + 10 `/services/*` | Catalog + individual service pages w/ Service & FAQ schema | per category |
| `/portfolio-programs` | 3 packaged offers + partnership process + consultation | portfolio |
| `/unit-turn-estimator` | Tool A | turnover (with estimator snapshot) |
| `/portfolio-savings-calculator` | Tools B + C | → consultation |
| `/request-a-turnover` `/request-a-property-walkthrough` `/request-a-renovation-estimate` | Direct request pages | turnover / walkthrough / rehab |
| `/how-it-works` `/projects` `/about` `/resources` `/contact` | Trust & content | contact |
| `/markets/{massachusetts,florida,maine}` | Market pages (FL/ME noindex until launch) | walkthrough |
| `/markets/{market}/{town}` | Town pages — **only `served: true` towns** (22 today) | turnover |
| `/service-areas` | Market overview | — |
| `/lp/{rental-turnover,portfolio-partnership,value-add-rehab,trade-work,urgent-turnover}` | Funnels A–E (noindex) | A–E |
| `/thank-you` `/privacy` `/terms` | Utility (privacy/terms are drafts for legal review) | — |
| `/portal` `/admin` | Client portal & ops dashboard prototypes | — |
| `/api/leads` `/api/crm-webhook` | Lead intake, CRM stage → conversion events | — |

## Lead form (one component, 7 funnel variants)
3 steps: **Who & what** (customer type, turnkey/à la carte/unsure, multi-select services) → **Property** (ZIP*, address, units, properties, move-out/move-in for turnovers, timeline, budget, engagement type, description, photo links) → **Contact** (name, email, phone, company/role for portfolio types, contact consent*, optional SMS consent with TCPA-style disclosure).
Spam: honeypot, 2.5s minimum fill time, rate limit, optional Cloudflare Turnstile. Idempotent on `eventId`.

## Town page policy
A town gets a page only when `served: true` in `markets.ts`, meaning crews actually cover it. Extended MetroWest/South Shore, the 7 extended FL cities and Maine neighbors are configured but `served: false` → no page, no sitemap entry, 404. Flip the flag after coverage is real, then add one local case study per town as soon as one exists.

## Market launch switch
`status: "launch"` → indexed, in sitemap, ads allowed. `licensing-pending` / `evaluation` → pages live with a notice, `noindex`, excluded from sitemap, estimator flags "not yet fully launched," and ads stay off.
