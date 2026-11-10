# 10 — Sales Offers, Proposal Templates & Scope-of-Work Generator

## The three packaged offers
| | Offer 1 — Single-Unit Turnover | Offer 2 — Rental Rehab | Offer 3 — Portfolio Partner |
|---|---|---|---|
| Promise | One scope, one schedule, one project coordinator | Full or partial renovation under an agreed scope and budget | Recurring maintenance, turnovers and renovations with centralized coordination |
| Buyer | Landlords, PMs (single unit) | Investors, owners | PMs, portfolio owners, HOAs |
| Agreement | Fixed price | Fixed price or cost-plus GMP | MSA + rate card; each job fixed/T&M |
| Payment | 50/50 (adjust per state deposit rules) | 10% / milestones / 10% retainage at punch | Per job; net-15/30 for approved vendors |
| Entry | Photo intake or walkthrough | Scope review + site walk (paid pre-close option) | Discovery → pilot unit |
| Deliverables | Line-item estimate, schedule, completion record | Room-by-trade scope, budget w/ contingency, milestone schedule, weekly photo reports | Rate card, portal, QBRs, annual summary |

**À la carte:** any line item or trade can be bought alone at rate-card pricing. Minimum trip charge per market price sheet.

## Scope-of-work generator (code)
`src/lib/sow.ts → generateSow(input)` produces a Markdown proposal for any offer × agreement type × market. Inputs: client, property, scope lines (can come straight from the Unit Turn Estimator output, re-priced to firm numbers after walkthrough), allowances, exclusions, dates, contingency %, GMP/fee %, T&M rate/NTE/markup, rate card, pilot criteria. Output sections: scope table with totals, pricing terms, payment schedule, change-order clause, exclusions, deliverables, licensing & insurance with **state clause placeholders flagged `[COUNSEL REVIEW]`**, signature block. Unit-tested.

Workflow: coordinator builds scope lines → `generateSow` → paste into GHL Documents & Contracts (or render PDF) → send for e-signature → signature moves opp to Won and fires `contract_signed`.

## Proposal template A — Single-Unit Turnover (fixed price)
1. Cover: property, unit, target rent-ready date
2. What we found (walkthrough photos, damage vs. wear notes)
3. Scope table — each line with **Approve / Defer** checkbox
4. Schedule: sequence of trades by day
5. Price & payment terms
6. Change-order policy (one paragraph)
7. Exclusions
8. Completion record contents
9. Licensing/insurance + state clauses
10. Signature

## Proposal template B — Rental Rehab
1. Executive summary: objective (e.g., reposition 6 units to ${target} rent), budget, duration
2. Existing conditions report
3. Scope by unit type → room → trade (quantities)
4. Allowances (finishes, fixtures) with selection deadlines
5. Contingency & how it's released (only by CO)
6. Milestone schedule with inspections & draw points
7. Agreement: fixed or cost-plus GMP (fee %, open-book reporting, shared savings option)
8. Reporting: weekly photo report, budget vs. actual, CO log
9. Risks & assumptions (hidden conditions, lead times, permits)
10. Team, licensing, insurance, state clauses; signature

## Proposal template C — Portfolio Partner
1. What we heard (pains, goals) from discovery
2. Pilot: property/unit, success criteria, date
3. After pilot: MSA terms, approval thresholds, owner-separated invoicing, portal users
4. Rate card: standard packages (light/standard/heavy turn by bedroom count) + line items
5. Service levels we commit to *(only those we can staff)*: scope turnaround after access, status cadence, punch closure window
6. Quarterly review agenda
7. Compliance packet: W-9, COI, licenses
8. Signature

## Change order form (fields)
Project ref · CO # · Date · Reason (hidden condition / client request / code requirement / make-safe) · Description · Photos · Price (+/−) · Schedule impact (days) · Approver (name, role, threshold) · Signature · Updated contract value.
