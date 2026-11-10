# 03 — Five Acquisition Funnels

Every funnel posts to `/api/leads` with `funnel` set, which drives scoring, pipeline routing (main vs. partnership), GHL tags and workflow selection.

## Funnel A — Rental Turnovers
**Path:** Google Search / Meta → `/lp/rental-turnover` → 3-step intake (unit, dates, condition, photo links) → GHL *Main* pipeline "New Lead" → photo request SMS/email → assessment (photo-scope or site walk) → line-item quote → schedule → completion.
**Offer:** "Get Your Unit Ready for the Next Tenant."
**Qualification:** in-market ZIP, unit count, move-in date, condition.
**Speed standard:** human response within 1 business hour (8a–6p); automation responds instantly.
**KPIs:** CPL, % with photos, photo-to-quote time (target < 48h), quote→win rate, days from intake to rent-ready.

## Funnel B — Portfolio Partnerships
**Path:** ABM/LinkedIn/email/calls (doc 06–07) → `/lp/portfolio-partnership` or `/portfolio-programs#consultation` → GHL *Partnership* pipeline "Prospect" → discovery call (30 min) → vendor prequalification (COI, W-9, vendor portal) → **pilot unit** → approved vendor → recurring work → expansion.
**Offer:** "One Vendor Relationship for Your Portfolio's Renovation Needs."
**Pilot success criteria (agree in writing before pilot):** scope delivered within 48h of access; schedule met ±1 business day; zero unapproved cost changes; closeout package delivered at completion; client satisfaction ≥ 9/10.
**KPIs:** accounts contacted → discovery → pilot → approved vendor conversion; time to first pilot; revenue per account at 6/12 months.

## Funnel C — Value-Add Investors
**Path:** Google Search (investor rehab terms) / broker partnerships / BiggerPockets-style communities (organic) → `/lp/value-add-rehab` → project details (units, acquisition status, budget, timeline, existing scope) → budget/scope review call → site walk → proposal (fixed or cost-plus GMP).
**Offer:** "Turn Your Renovation Plan Into an Executable Scope."
**Pre-close option:** paid scope-and-budget walkthrough (owner to set fee; credit toward contract if awarded).

## Funnel D — À la Carte Trade Work
**Path:** service-specific Search/Meta ad → `/lp/trade-work` (or matching `/services/*`) → condition/scope form → estimate → scheduling.
**Offer:** "Need One Trade or a Full Rehab? Start Here."
**Upsell logic:** each service page lists `upsells`; estimates include an optional "while we're there" line that is separately approved — never bundled silently.

## Funnel E — Time-Sensitive Turnovers
**Path:** high-intent local search ("apartment turnover contractor near me", "make ready this week") → `/lp/urgent-turnover` → availability + scope intake → GHL tag `funnel:urgent` → rapid sales review queue.
**Guardrail:** `site.urgentTurnoverStaffed = false` keeps all response-time promises off the site. Do not advertise same-day/emergency service until a staffed on-call rotation exists. Ad copy must say "rapid review," not "emergency."

## Shared mechanics
- **Scoring** (`src/lib/leads.ts`, editable weights): customer type, units, budget, timeline, recurring vs. one-off, in-market, photos → `hot ≥ 60`, `warm ≥ 35`, else `nurture`.
- **Routing:** `portfolio` funnel, or PM/portfolio/HOA with ≥10 units or recurring → Partnership pipeline. Everything else → Main.
- **Out-of-market leads:** stored and tagged `market:out-of-area`; auto-reply explains coverage honestly; no paid follow-up.
- **Non-launch markets (FL/ME):** stored, tagged, routed to a waitlist review stage; nothing scheduled until licensed/insured.
