# 04 — Google Search Campaign Build

> **Demand validation required.** Keyword lists below are the build hypothesis. Before launch, run each ad group through Keyword Planner by city (Boston DMA; West Palm Beach–Fort Lauderdale DMA) and drop terms with no measurable volume. Expect *low volume, high value* B2B terms — that's why exact/phrase dominate and budgets are modest.

## Account structure
Separate Google Ads **accounts** are not required, but use separate **campaigns per market** so budgets, schedules, location targeting and margin reporting never mix.

```
Account: PortfolioWorks
├── MA | Search | Turnovers            (Funnel A)  → /lp/rental-turnover
├── MA | Search | Property Managers    (Funnel B)  → /lp/portfolio-partnership
├── MA | Search | Investor Rehab       (Funnel C)  → /lp/value-add-rehab
├── MA | Search | Trade Services       (Funnel D)  → /services/* or /lp/trade-work
├── MA | Search | Urgent Turnover      (Funnel E)  → /lp/urgent-turnover   [paused until staffed review SLA exists]
├── MA | Search | Brand                              → /
├── FL | Search | Turnovers & Condo    [PAUSED — enable only after FL licensing/insurance verified]
├── FL | Search | Property Managers    [PAUSED]
└── ME | Search | Test                 [NOT BUILT — evaluate after 90 days; ≤$15/day test if pursued]
```

**Settings (all):** Search Network only (no Display, no Search Partners at launch) · Location: *Presence* only (not "presence or interest") · MA radius/city list = served towns · Ad schedule Mon–Sat 7a–8p local · Bidding: Maximize Conversions (on `generate_lead`) for first 30 conversions per campaign → move to tCPA, then to value-based bidding once offline conversion import (qualified_lead, contract_signed) has ≥30 events/month · Enhanced conversions for leads ON.

## Conversion actions
| Action | Source | Primary? | Value |
|---|---|---|---|
| `generate_lead` (form submit) | GTM web | Primary at launch | $50 (placeholder) |
| Calls from ads ≥ 60s | Call assets | Primary | $50 |
| `qualified_lead` | Offline import via GCLID (GHL stage) | Secondary → Primary at 30/mo | $250 |
| `site_walk_booked` | Offline import | Secondary | $400 |
| `contract_signed` | Offline import | Secondary → Primary (value-based) | Actual contract value |
| `purchase` (paid) | Offline import | Secondary | Actual invoice value |

## Daily budgets (starting assumptions — owner to approve)
| Campaign | Day 1–30 | Day 31–90 (if CPL & quality hold) |
|---|---|---|
| MA Turnovers | $45 | $60–90 |
| MA Property Managers | $30 | $40–60 |
| MA Investor Rehab | $25 | $30–50 |
| MA Trade Services | $25 | $30–50 |
| MA Brand | $5 | $5 |
| MA Urgent | $0 (paused) | $20 once staffed |
| **MA total** | **≈ $130/day (~$3.9k/mo)** | $185–275/day |
| FL (after verification) | $0 | $40–60 test |

Kill/scale rules: after ≥ 25 clicks, pause any keyword with 0 conversions and CPC > 2× ad-group average. After 30 days, shift budget toward the campaign with the lowest cost per **qualified** lead, not raw CPL.

---

## Campaign: MA | Search | Turnovers

### Ad group: Apartment Turnover Contractors
Keywords
- [apartment turnover contractors] · [apartment turnover services] · "apartment turnover contractor" · "unit turnover services"
- [rental turnover boston] · "rental turnover contractor" · "rental property turnover"
- [apartment make ready contractors] · "make ready services" · "make ready contractor boston"

### Ad group: Rental Renovation Boston
- [rental property renovation boston] · "rental renovation boston" · "rental property rehab near me" · "apartment renovation contractor boston" · "landlord renovation contractor"

### Ad group: Landlord Painting
- [landlord painting contractor] · "apartment painting contractor boston" · "rental unit painting" · "painting between tenants"

**RSA — Turnovers (pin H1 slot to one of the first two)**
Headlines (≤30)
- Rental Turnovers, One Partner
- Apartment Turnover Contractor
- Tenant Moved Out? We Handle It
- One Scope. One Schedule.
- Line-Item Turnover Estimates
- Paint, Floors, Repairs, Clean
- Greater Boston Rental Turns
- Stop Calling Five Contractors
- Photo-Documented Closeout
- Get a Unit Turn Estimate
- Written Change Orders Only
- Built for Landlords & PMs
- Make-Ready, Fully Managed
- Request a Turnover Today
- One Trade or the Whole Unit

Descriptions (≤90)
- Paint, flooring, repairs, fixtures and cleaning coordinated as one priced turnover scope.
- Line-item estimate and schedule. Nothing added without your written approval.
- Send photos of the unit and get a scope back. Greater Boston landlords and managers.
- Before/after photos and a completion record for every unit. We handle the hard part.

---

## Campaign: MA | Search | Property Managers
### Ad groups & keywords
- **PM Maintenance Contractors:** [property management maintenance contractors] · "property management contractor" · "maintenance vendor for property managers" · "property manager vendor boston"
- **GC for PMs:** [general contractor for property managers] · "contractor for property management companies" · "multifamily maintenance contractor"
- **Multifamily Renovation:** [multifamily renovation contractor] · "multifamily renovation boston" · "apartment building renovation contractor" · "unit renovation program"
- **Condo/HOA:** [condo renovation contractor boston] · "hoa contractor" · "condo association contractor" · "common area renovation"

**RSA — Property Managers**
Headlines
- Contractor for Property Mgrs
- One Vendor for Every Property
- Turnovers, Repairs, Rehabs
- Owner-Level Invoicing
- Approval Thresholds Built In
- Start With One Pilot Unit
- Client Portal for Every Job
- Multifamily Renovation Partner
- Consistent Pricing, Rate Card
- Fewer Vendors, More Control
- Request a Partnership Call
- Greater Boston Portfolios
- Photo Records on Every Job
- COI & W-9 Ready
- One Point of Accountability

Descriptions
- Turnovers, repairs and renovations for every owner you manage, through one partner.
- Pilot a unit first. Then a rate card, portal access and owner-separated invoicing.
- Written scopes, change-order approvals and photo closeouts your owners can see.
- Built for property managers who are tired of chasing five different contractors.

---

## Campaign: MA | Search | Investor Rehab
- **Investor Rehab:** [investor rehab contractor] · "rehab contractor for investors" · "fix and rent contractor" · "rental rehab contractor boston"
- **Value-Add:** "value add renovation contractor" · "multifamily value add renovation" · "apartment repositioning contractor"
- **Capex:** "capital improvements contractor" · "multifamily capex contractor"

**RSA — Investor Rehab**
Headlines
- Investor Rehab Contractor
- Rehab Scope Before You Close
- Value-Add Renovation Partner
- Budget, Schedule, Milestones
- Executable Rehab Scopes
- Fixed Price or Cost-Plus GMP
- Weekly Photo Progress Reports
- Unit Upgrade Packages
- Draw-Friendly Payment Terms
- Greater Boston Rehabs
- Get a Renovation Estimate
- Turn Your Plan Into a Scope
- Change-Order Control
- Multifamily Unit Renovations
- Built by a Developer

Descriptions
- Turn your renovation plan into an executable scope with budget, schedule and milestones.
- Pre-close walkthroughs, unit upgrade packages and weekly photo reports for investors.
- Fixed price where scope is clear; open-book cost-plus with a GMP where it is not.
- Rehabs, repositioning and capex for Greater Boston rental and multifamily property.

---

## Campaign: MA | Search | Trade Services
One ad group per service, each landing on its `/services/*` page:
- **Bathroom for Rentals:** "bathroom renovation for rental property" · "rental bathroom remodel" · "bathroom refresh rental"
- **Rental Flooring:** "rental flooring installation" · "lvp installation rental" · "apartment flooring contractor"
- **Rental Kitchen:** "rental kitchen renovation" · "cabinet refacing rental"
- **Rental Painting:** "apartment painting contractor" · "rental unit painting"
- **Rental Carpentry/Repairs:** "landlord repair contractor" · "rental property repairs"

Headline set reuses the service name + "for Rental Properties", "Line-Item Pricing", "One Trade or the Whole Unit", "Licensed Trades Coordinated", "Photo-Documented Closeout". Descriptions mirror the service page's `short` + deliverables.

## Campaign: MA | Search | Brand
[portfolioworks] · [portfolioworks contracting] · "portfolio works contracting" → homepage; Headlines: PortfolioWorks Contracting · Official Site · One Partner. Every Property.

## FL campaigns (build paused)
Keywords: [rental turnover south florida] · "rental turnover fort lauderdale" · "rental property renovation boca raton" · "condo renovation delray beach" · "make ready contractor west palm beach" · "property management contractor palm beach". Copy swaps "Greater Boston" → "Palm Beach & Broward" and adds "Condo Association Ready" / "COI for Your Association" headlines. **Do not enable** until FL licensing/insurance is verified and `markets.ts` FL status = `launch`.

---

## Negative keywords (shared list "PW-Core-Negatives")
jobs · job · hiring · career · salary · employment · apprentice · training · course · certification · license exam · how to become · diy · do it yourself · youtube · tutorial · template free · pdf · checklist free · software · app · tenant rights · eviction · lawyer · attorney · section 8 voucher · apartment for rent · apartments for rent · rent an apartment · cheap apartments · roommate · homeowner insurance · home depot · lowes · rental equipment · tool rental · carpet cleaning only · maid service · moving company · movers · storage · junk removal (test separately) · commercial office · retail fit out · new construction home builder · modular · tiny house · pool · roofing (unless offered) · solar · free estimate template · reddit · yelp · angi · thumbtack · homeadvisor · craigslist

Ad-group negatives: cross-negate ad groups (e.g., "painting" negative in Turnovers group so painting queries route to the painting ad group).

## Assets
**Sitelinks (account level)**
| Text (≤25) | Desc line 1 | Desc line 2 | URL |
|---|---|---|---|
| Unit Turn Estimator | Preliminary range in 60 seconds | Not a quote—planning tool | /unit-turn-estimator |
| Portfolio Programs | Pilot unit, rate card, portal | For PMs and portfolio owners | /portfolio-programs |
| How It Works | Seven steps, scope to closeout | Written approvals throughout | /how-it-works |
| Request a Walkthrough | Get a property project plan | One unit or a full building | /request-a-property-walkthrough |
| Rental Rehab | Scope, budget, milestones | For value-add investors | /request-a-renovation-estimate |
| Service Catalog | Paint, floors, kitchens, baths | One trade or full scope | /services |

**Callouts:** Line-Item Estimates · Written Change Orders · Photo Closeout Records · Licensed Trades Coordinated · Client Portal · Pilot Unit Option
**Structured snippet (Services):** Turnovers, Painting, Flooring, Bathrooms, Kitchens, Carpentry, Full Rehab
**Call asset:** market tracking number (CallRail or GHL number pool), call reporting ON, conversion = calls ≥ 60s, schedule business hours only.
**Lead form asset:** OFF at launch (lower quality); test month 3.

## Optimization cadence
- **Daily (wk 1–2):** search terms → negatives; disapprovals; budget pacing.
- **Weekly:** search terms, CPL by ad group, lead quality notes from GHL (tag `junk`, `qualified`), RSA asset ratings, impression share lost to rank vs. budget.
- **Monthly:** move to tCPA/value bidding when data allows; reallocate budget by **cost per qualified lead** and **cost per won job** (doc 13); landing page A/B (headline, form length).
- **Quarterly:** review market expansion (FL launch, ME test), new ad groups from converting search terms.
