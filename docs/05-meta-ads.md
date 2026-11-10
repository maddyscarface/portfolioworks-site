# 05 — Meta (Facebook/Instagram) Campaigns

## Special Ad Category — run as HOUSING
Meta's Housing category covers ads promoting housing opportunities *and housing repair services*. Treat every PortfolioWorks campaign as **Special Ad Category = Housing** unless Meta confirms otherwise in writing. Consequences to plan around:
- No age, gender or ZIP targeting; no exclusions; location = cities/regions or **≥15-mile radius**.
- Lookalikes replaced by "special ad audiences"; detailed targeting limited.
- Instant forms can't ask for demographics. We send traffic to our own landing pages instead.
- Copy must not imply preference for any tenant/owner group. No "perfect for young professionals," no neighborhood-character language.

**Targeting approach:** Boston-area radius (15 mi from Boston City Hall covers most core towns) → broad / Advantage+ audience with interest *suggestions* (Real estate investing, Property management, Landlord, Rental property, Multifamily). Let the pixel + CAPI optimize on `Lead`. Retargeting via website custom audiences (allowed within Housing, subject to restrictions).

## Structure
```
Campaign (Leads objective, Housing SAC, CBO) — one per offer below
  └─ Ad set: MA 15-mi radius, broad + interest suggestions, website conversions on Lead
       └─ 5 ads (variants below) — static, carousel, 15s, 30s
Retargeting campaign (Housing SAC): site visitors 30d not converted; estimator users 14d
```
Budget start: $25/day per prospecting campaign (Turnover, PM, Investor), $15/day À la carte, $10/day Multi-Property, $10/day retargeting ≈ **$95/day**. Scale winners +20% every 3–4 days if cost per qualified lead holds.

Conversion events: `Lead` (browser + CAPI, deduped on `event_id`), `Schedule` (site walk booked, CAPI from GHL), `QualifiedLead` / `ContractSigned` / `Purchase` (CAPI from CRM webhook). Optimize on `Lead` until ≥50 `QualifiedLead`/week, then test optimizing on `QualifiedLead`.

---

## Campaign 1 — Landlord Turnover
**Core:** "Tenant Moved Out? We Handle What's Next." → `/lp/rental-turnover`

| # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | Tenant moved out. Now you need a painter, a flooring guy, someone for the bathroom, a handyman and a cleaner—on the same week. Or one partner who scopes, schedules and finishes all of it. | Tenant Moved Out? We Handle What's Next. | Line-item turnover estimates |
| 2 | Send us photos of the unit. Get back a line-item turnover scope: paint, floors, fixtures, repairs, cleaning. Approve what you want, defer what you don't. | Get Your Unit Ready for the Next Tenant | Greater Boston landlords |
| 3 | The work isn't the hard part. Coordinating five trades is. PortfolioWorks runs your turnover as one scope with one coordinator, start to finish. | One Scope. One Schedule. One Partner. | We handle the hard part |
| 4 | Every turnover ends with a completion record: before/after photos, paint colors, flooring products and the invoice tied to what you approved. Next turn starts faster. | Turnovers With a Paper Trail | Photo-documented closeout |
| 5 | Wondering what this turn will cost? Our Unit Turn Estimator gives you a preliminary range in about a minute—then submit the unit for a written scope. | What Will This Turnover Cost? | Try the free estimator |

## Campaign 2 — Property Manager
**Core:** "One Partner for Repairs, Turnovers and Renovations." → `/lp/portfolio-partnership`

| # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | You manage dozens of owners. You shouldn't manage dozens of vendors. One partner for repairs, turnovers and renovations, with owner-separated invoicing. | One Partner for Repairs, Turnovers & Renovations | For property managers |
| 2 | Set approval thresholds once. Your team approves small items; bigger scopes route to the owner. Every estimate, change order and photo lives in one portal. | Approvals That Match How You Work | Portal + thresholds |
| 3 | Don't take our word for it—give us one unit. A pilot turnover shows you our scoping, communication, schedule and closeout before any agreement. | Start With One Pilot Unit | No retainer to start |
| 4 | Work orders that disappear into a contractor's voicemail cost you owner trust. We confirm, scope and schedule—and you see status without chasing. | Stop Chasing Vendor Updates | Status in one place |
| 5 | COI, W-9 and vendor-platform onboarding handled up front. Then a rate card so owners see consistent pricing across properties. | Vendor-Ready From Day One | Consistent rate card |

## Campaign 3 — Investor Rehab
**Core:** "Bought a Value-Add Property? Build the Rehab Plan Before the Delays Begin." → `/lp/value-add-rehab`

| # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | Bought a value-add property? The delays start when the scope is still a spreadsheet. We turn your plan into a room-by-room, trade-by-trade executable scope. | Build the Rehab Plan Before the Delays Begin | Scope · budget · schedule |
| 2 | Walk it before you close. A pre-acquisition scope and budget helps you underwrite—and negotiate—with real numbers. | Scope It Before You Close | Pre-close walkthroughs |
| 3 | One fixed price per unit type, applied as units turn. Cost-per-unit you can report to your partners. | Unit Upgrade Packages | Cost-per-unit control |
| 4 | Weekly photo reports, budget vs. actual and a change-order log you can forward straight to your investors. | Rehab Reporting Your LPs Will Read | Weekly progress |
| 5 | Fixed price where the scope is clear. Open-book cost-plus with a guaranteed maximum where it isn't. Either way, nothing changes without your signature. | The Right Contract for the Rehab | Fixed or cost-plus GMP |

## Campaign 4 — À la Carte
**Core:** "Painting, Flooring, Bathrooms, Carpentry or Full Renovation—One Place to Start." → `/lp/trade-work`

| # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | Need a repaint? A floor? A bathroom refresh? Or the whole unit? Start in one place and get exactly the scope you asked for. | One Trade or a Full Rehab—Start Here | Line-item pricing |
| 2 | Two bedrooms of LVP and nothing else? That's a job. Every trade available on its own with a written estimate. | Book Just the Trade You Need | No forced bundles |
| 3 | Plumbing, electrical and HVAC handled by licensed trades—scheduled inside the same scope as your paint and floors. | Licensed Trades, One Schedule | Coordinated for you |
| 4 | Your repair list has been growing for months. Send it over—we'll price each item and batch them into one visit. | Clear the Repair List in One Visit | Itemized pricing |
| 5 | Painting, flooring, bathrooms, carpentry or full renovation. Same documentation standard whether it's one item or fifty. | Same Standard, Any Size Job | Photo closeout every time |

## Campaign 5 — Multi-Property
**Core:** "Your Portfolio Needs a System, Not Another Contractor Phone Number." → `/portfolio-programs`

| # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | Your portfolio needs a system, not another contractor phone number. Standard unit packages, a rate card and every project in one portal. | A System for Your Portfolio | Not another phone number |
| 2 | How many turns will you run next year? Our Portfolio Planner estimates your volume, quarterly workload and budget in two minutes. | Plan Next Year's Turnovers | Free planning tool |
| 3 | Define light, standard and heavy turn packages once. Every unit after that is priced from the same sheet. | Standard Packages, Predictable Costs | Built for 10–100+ units |
| 4 | Spend by property, unit and category. Cycle times. Open items. Reviewed with you every quarter. | Portfolio Reporting, Built In | Quarterly reviews |
| 5 | Three properties or thirty. One accountable partner coordinating every trade across all of them. | One Partner. Every Property. | Every project |

---

## Creative briefs

### Static image briefs (1080×1350 feed, 1080×1920 stories)
1. **Split before/after** of the same room, navy top band with headline in white serif, bronze rule. *(Real project only.)*
2. **"Five contractors" graphic:** five phone-call icons crossed out → one PortfolioWorks mark. Paper background.
3. **Document stack:** line-item estimate, change order, completion record fanned on a desk; headline "Turnovers With a Paper Trail."
4. **Portal screenshot** (from `/portal`, demo data blurred or clearly sample) on a laptop.
5. **Estimator UI** crop showing a range card with "Preliminary · not a quote."

### Carousel concepts
- **"Move-out to move-in in 5 steps":** 1 Intake → 2 Walkthrough → 3 Scope & price → 4 Execution → 5 Closeout → CTA card.
- **"One trade or the whole unit":** Paint / Floors / Bath / Kitchen / Carpentry / Full rehab, each card a service photo + one-line scope.
- **"What's in a completion record":** Before photos · Scope · Change orders · After photos · Products & colors · Invoice.

### 15-second video scripts
**V15-A (Landlord):** 0–3s: phone screen with five missed contractor calls. VO: "Tenant moved out?" 3–9s: coordinator walking unit, tablet photos. VO: "One scope. One schedule. Paint, floors, repairs, clean." 9–13s: after shots. 13–15s: end card "Get Your Unit Ready for the Next Tenant."
**V15-B (PM):** 0–3s: overflowing work-order inbox. VO: "Too many vendors?" 3–11s: portal scroll — projects, approvals, photos. VO: "One partner for repairs, turnovers and renovations." 11–15s: "Start with one pilot unit."

### 30-second video scripts
**V30-A (Founder):** Gary on site. "I own rental property in Greater Boston. I've made the five calls, waited on the bid that never came and walked the punch list that never closed. So I built PortfolioWorks: one scope, one schedule, one accountable partner—with a written record of everything. Send us a unit. We'll handle the hard part." End card + URL.
**V30-B (Process):** Time-lapse of a real turnover with on-screen step labels (Intake → Walkthrough → Scope → Execution → Closeout), closing on the completion record PDF. VO tagline.
*All video uses real projects, real staff, permissioned properties.*

## Retargeting sequences
| Audience | Window | Message | Destination |
|---|---|---|---|
| Visited service/LP, no lead | 1–7d | Estimator / "send photos" ad | /unit-turn-estimator |
| Visited, no lead | 8–30d | Founder V30-A, process carousel | /how-it-works |
| Used estimator, no lead | 1–14d | "Turn that range into a written scope" | /request-a-turnover |
| Visited /portfolio-programs | 1–30d | Pilot-unit offer | /lp/portfolio-partnership |
| Leads (exclude via CRM list where allowed) | — | Suppress prospecting | — |
Frequency cap target: ≤ 3/week per person.
