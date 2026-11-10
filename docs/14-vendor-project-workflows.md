# 14 — Vendor (Subcontractor) & Project Management Workflows

## Subcontractor onboarding (approved network)
1. **Application:** trade, markets/towns covered, crew size, references (3), sample photos.
2. **Compliance packet (required before any work):** W-9; certificate of general liability (name PortfolioWorks as additional insured) and workers' comp or valid exemption per state; state license where the trade requires one (verify on the state lookup and screenshot to file); EPA RRP certification for painting/carpentry on pre-1978 work in MA.
3. **Agreement:** master subcontract — scope via work orders, payment terms, warranty/callback obligations, photo-documentation standard, no direct solicitation of PortfolioWorks clients, safety/OSHA compliance, cleanup standard.
4. **Trial job** on a low-risk scope with coordinator on site.
5. **Activation** in the sub table with markets and trades; calendar availability.
6. **Expiry monitoring:** COI and license expirations tracked; 45-day warning (shown in `/admin`); a sub with an expired COI or license cannot be assigned.

## Scorecard (monthly)
On-time start %, on-time finish %, callback rate, punch items per job, photo compliance %, client feedback. Two consecutive months below threshold → improvement plan; three → deactivate.

## Self-perform vs. subcontract
Self-perform where crew and licensing allow (painting, drywall, carpentry, LVP); subcontract licensed trades (plumbing, electrical, HVAC, gas) always, and tile/countertops/specialty as needed. PortfolioWorks remains the accountable party to the client.

## Project lifecycle SOP (coordinator)
| Stage | Coordinator actions | Done when |
|---|---|---|
| Requested | Review intake, request photos, assess market/licensing fit | Photos or walk booked |
| Estimating | Walk/photo review, condition notes by room, scope lines from price sheet | Estimate reviewed by admin if > $15k or GM < 30% |
| Proposal | Generate SOW (`generateSow`), send for signature | Signed or Lost |
| Approved/Scheduled | Order materials, book subs in sequence, tenant notice via PM, access plan | Schedule confirmed with client |
| In progress | Daily check-in, progress photos, CO for any change, inspections booked | Work complete |
| Punch list | Punch walk with photos, assign items, re-walk | All items closed or waived in writing |
| Complete | After photos, completion record, final invoice | Record delivered |
| Paid | Review request, update property record (colors, SKUs), schedule repeat outreach | — |

## Turn sequencing standard
Repairs/demo → drywall/plaster → licensed rough work → prime/paint → flooring → fixtures/hardware/appliance connections → touch-up → clean → punch walk → photos.

## Photo documentation standard
Before: every room, 4 corners + floor + ceiling issues + all damage close-ups. Progress: any concealed work (plumbing, waterproofing, subfloor) before it's covered. After: same angles as before. Naming: `{project}/{phase}/{room}-{n}.jpg`.

## Safety & compliance
OSHA 30-trained supervision; site-specific hazard check on first visit; lead-safe containment on pre-1978 work; no work in occupied units without documented notice; incidents reported to admin same day.
