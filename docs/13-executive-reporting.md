# 13 — Executive Reporting & Management Dashboard

## Sources
- **Marketing:** Google Ads, Meta Ads (spend, clicks), GA4 (sessions, events), call tracking
- **Pipeline:** GHL opportunities (stage, value, source fields, market, customer type, company)
- **Projects & margin:** project DB (`docs/db/schema.sql`) or `/admin` prototype; QuickBooks for actual cost & revenue
Build in Looker Studio (connectors: Google Ads, GA4, Sheets) with a nightly GHL → Google Sheets export, or in the `/admin` route once the DB is live.

## KPI definitions
| KPI | Formula | Cadence | Target (set after 60 days of data) |
|---|---|---|---|
| Leads | count(contacts created w/ `funnel:*`) | weekly | — |
| Qualified leads | count(opps reaching Qualified) | weekly | — |
| Lead → qualified rate | qualified / leads | weekly | — |
| Site walks | count(Site Walk stage) | weekly | — |
| Proposals | count(Proposal stage) | weekly | — |
| Won projects | count(Won) | weekly | — |
| Win rate | won / proposals | monthly | — |
| Contract value | Σ contract value at Won | monthly | — |
| Project revenue | Σ invoiced (QBO) | monthly | — |
| Gross margin | revenue − direct cost (labor, subs, materials, permits, disposal) | monthly | ≥ 30% target, floor 25% |
| Project duration | completed_at − start_date (median, by service) | monthly | — |
| Revenue per property | revenue / distinct properties served | quarterly | — |
| Revenue per client account | revenue / distinct accounts | quarterly | — |
| Cost per acquired PM account | (ads + outbound tooling + SDR time) attributed to partnership pipeline / accounts reaching Approved Vendor | quarterly | — |
| Cost per won job | marketing spend / won jobs (by channel) | monthly | — |
| Repeat revenue % | revenue from accounts with ≥ 2 projects / total revenue | quarterly | rising |
| Portfolio contract renewals | renewed MSAs / MSAs up for renewal | annually | ≥ 80% |
| Unit turnover volume | count(projects service=rental-turnovers completed) | monthly | — |
| Average cost per unit | turnover revenue / units turned | monthly | by package tier |
| Change-order value | Σ approved CO / Σ original contract | monthly | track; >15% = scoping issue |
| Subcontractor performance | on-time %, callback %, COI compliance | monthly | on-time ≥ 90%, callbacks ≤ 5% |

Every acquisition metric is cut by **service × region × customer type × property account × channel**.

## Dashboard layout
**Page 1 — Executive (one screen):** revenue MTD/QTD vs plan · GM % · backlog (signed not started) · pipeline value by stage · won jobs · cost per won job · repeat revenue % · cash collected vs invoiced.
**Page 2 — Acquisition:** spend, leads, qualified, CPL, cost per qualified lead, cost per won job by channel & campaign; funnel A–E conversion rates; lead response time.
**Page 3 — Partnership:** accounts by stage (Prospect → Expansion), pilots in progress, pilot → approved vendor rate, revenue per account, renewals due.
**Page 4 — Operations:** active projects, due in 7 days, overdue, punch items open, median duration by service, CO value %, inspections pending.
**Page 5 — Margin:** GM by project, service, market, agreement type; estimate vs actual variance; low-margin flags.
**Page 6 — Vendors:** sub on-time, callbacks, COI/license expiring in 45 days, active jobs per sub.

## Weekly management meeting (45 min)
1. Numbers (Page 1–2) — 10 min
2. Pipeline: every hot lead and every proposal > 5 days old — 15 min
3. Operations: overdue, punch, COs pending, sub issues — 15 min
4. One improvement decision for the week — 5 min
