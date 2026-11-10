# 08 — GoHighLevel Sub-Account, Pipelines & Automations

**Status:** Adapter code is written (`src/lib/integrations.ts → pushToGhl`) but **not connected or validated**. Requires a Private Integration token with scopes `contacts.write`, `opportunities.write`, `locations/customFields.readonly`.

## Sub-account
Name: **PortfolioWorks Contracting** (separate from DeckCraft/StoneCraft). Time zone America/New_York. Separate phone number pool per market (MA now, FL later), separate email sending domain (`mail.portfolioworkscontracting.com`, SPF/DKIM/DMARC), A2P 10DLC registration for SMS **before** any SMS workflow is enabled.

## Data model in GHL
- **Company** (Business) = client account (PM firm, owner entity, HOA).
- **Contact** = person; associated to Company; role in `pw_contact_role`.
- **Opportunity** = one project at one property (main pipeline) or one account relationship (partnership pipeline). Name format: `{Company} — {Property} — {Unit/Scope}`.
- **Custom Object "Property"** (GHL custom objects) with fields address, units, year built, owner entity, market; associate to Company and Opportunities. If custom objects aren't on your plan, use the `pw_property_addresses` multi-line field + opportunity naming.
This supports one account → many properties → many projects.

## Custom fields (keys must match code)
| Key | Type | Notes |
|---|---|---|
| pw_customer_type | Dropdown | landlord, portfolio-owner, property-manager, investor, broker, hoa, other |
| pw_contact_role | Text | |
| pw_units / pw_properties | Number | |
| pw_property_addresses | Large text | |
| pw_trade_needs | Text | comma list of service slugs |
| pw_delivery_mode | Dropdown | turnkey, a-la-carte, unsure |
| pw_priority | Dropdown | hot, warm, nurture |
| pw_lead_score | Number | 0–100 |
| pw_budget / pw_timeline | Dropdown | match form values |
| pw_contract_type | Dropdown | single-project, recurring, unsure |
| pw_est_project_value | Monetary | |
| pw_market / pw_sales_territory | Text | |
| pw_move_out / pw_target_move_in | Date (text from site) | |
| pw_photo_urls | Large text | |
| pw_event_id | Text | **key for conversion matching** |
| pw_gclid / pw_fbclid / pw_utm_campaign / pw_landing_page / pw_ga_client_id | Text | attribution |
| pw_description | Large text | |
| pw_abm_score / pw_abm_reasons | Number / Text | doc 06 |
| pw_agreement_type | Dropdown | fixed-price, time-and-materials, cost-plus-gmp |
| pw_contract_value / pw_gross_margin | Monetary | filled at Won / Complete |

Tags auto-applied by the site: `funnel:*`, `type:*`, `tier:*`, `market:*`, `svc:*`, `sms-consent`.

## Pipelines
**Main** (env `GHL_PIPELINE_MAIN`, first stage id → `GHL_STAGE_MAIN_NEW_LEAD`)
New Lead → Qualified → Scope Intake → Site Walk → Estimate → Proposal → Negotiation → Won → Scheduled → In Progress → Punch List → Complete → Paid → Repeat/Nurture
(+ Lost, + Waitlist – Non-launch Market)

**Portfolio Partnership** (`GHL_PIPELINE_PARTNERSHIP`, `GHL_STAGE_PARTNERSHIP_PROSPECT`)
Prospect → Contact Verified → Outreach → Discovery → Vendor Prequalification → Pilot Property → Approved Vendor → Recurring Work → Expansion
(+ Not a Fit)

Stage-change webhook → `/api/crm-webhook` for: Qualified (`qualified_lead`), Site Walk (`site_walk_booked`), Proposal (`proposal_sent`), Won (`contract_signed`), Paid (`purchase`).

## Automations (workflows)
| # | Workflow | Trigger | Actions |
|---|---|---|---|
| 1 | **Instant lead response** | Contact created w/ tag `funnel:*` | Email immediately (template L1); SMS only if `sms-consent` (S1); internal notification to coordinator (hot = SMS + email; warm = email); create task "Call within 1 business hour" |
| 2 | **Photo request** | Opp in New Lead, `pw_photo_urls` empty, funnel turnover/trade/urgent | Wait 10 min → email with secure upload link (GHL form w/ file upload) → +1 day reminder → +3 days task for call |
| 3 | **Site walk booking** | Stage → Site Walk | Send market calendar link (`{{calendar.MA}}`); on booking: confirmation email + SMS(if consent) + webhook `site_walk_booked` |
| 4 | **Reminder sequence** | Appointment booked | 24h and 2h reminders; no-show → reschedule email + task |
| 5 | **Estimate follow-up** | Stage → Estimate | +2 days: "questions on the estimate?" → +5 days call task |
| 6 | **Unsigned proposal follow-up** | Stage → Proposal (document sent) | Day 2 / 5 / 10 emails (doc 07 copy) → Day 14 move to Negotiation or Lost (manual) |
| 7 | **Project status notifications** | Stage → Scheduled / In Progress / Punch List / Complete | Templated status email (and SMS if consent) to all contacts on the opportunity; portal link |
| 8 | **Change-order approvals** | Tag `co-pending` added | Email CO document link for e-signature; remind 24h; escalate to owner contact if over threshold (`pw_co_threshold`) |
| 9 | **Invoice notifications** | Invoice sent (GHL Payments or QuickBooks sync) | Email invoice; reminders at due−3, due+3, due+10; stage → Paid on payment + webhook `purchase` |
| 10 | **Post-project review** | Stage → Paid | +2 days: satisfaction survey (1–10). ≥9 → Google review request. ≤6 → task to owner for call. *Never gate reviews by sentiment in a way that violates Google policy—send the review link to everyone who completes the survey, and handle complaints separately.* |
| 11 | **Repeat turnover outreach** | Stage → Paid, customer type landlord/portfolio | +10 months (lease cycle): "Next turnover coming up at {{property}}?" |
| 12 | **Property manager re-engagement** | PM contact with no open opp for 60 days | Value email (planner/checklist) → +14d check-in → task |
| 13 | **Portfolio renewal reminders** | Partnership opp in Recurring Work, `pw_agreement_end` − 60 days | Annual summary email (doc 07) + task to schedule review |
| 14 | **Non-launch market waitlist** | Tag `market:florida` or `market:maine` | Honest auto-reply ("opening soon; we'll confirm availability"); stage Waitlist; no sales tasks until market launches |
| 15 | **Out-of-area** | Tag `market:out-of-area` | Polite decline/referral email; no further automation |

### Message templates (short)
- **L1 email — subject:** "We received your request — PortfolioWorks" — "Thanks, {{first}}. A coordinator is reviewing your {{funnel}} request for {{zip}}. Next step: {{next_step_by_funnel}}. If you have photos or a video walkthrough, upload them here: {{upload_link}}. — PortfolioWorks"
- **S1 SMS (consented only):** "PortfolioWorks: got your request for {{zip}}. A coordinator will contact you shortly. Upload photos: {{short_link}} Reply STOP to opt out."
- **Status:** "{{project}} at {{property}} is now {{stage}}. {{detail}} View in your portal: {{portal_link}}"

## Calendars
- MA Site Walk (60 min, coordinator round-robin, 30-min buffer, Mon–Sat)
- Discovery Call (30 min, founder)
- FL/ME calendars created but inactive until launch.

## Setup checklist
1. Create sub-account, users, number pool, sending domain, A2P 10DLC.
2. Create custom fields with exact keys above.
3. Create both pipelines; copy pipeline and first-stage IDs into env.
4. Create Private Integration token; set `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`.
5. Build workflows 1–15; keep SMS steps disabled until A2P approved.
6. Stage-change webhook → `https://{domain}/api/crm-webhook` with header `x-pw-webhook-secret`.
7. Test: submit each funnel on staging; confirm contact, tags, fields, opportunity, workflow firing.
