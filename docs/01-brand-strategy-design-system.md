# 01 — Brand Strategy & Design System

## Identity
| Item | Value | Status |
|---|---|---|
| Working brand | **PortfolioWorks Contracting & Property Services** | VERIFY: USPTO/TESS search (classes 37 construction/repair services, 36 real-estate management), MA/FL/ME entity & DBA availability |
| Domain | portfolioworkscontracting.com | VERIFY availability; also secure portfolioworks.co, getportfolioworks.com as defensive/redirects |
| Primary line | One Partner. Every Property. Every Project. | Final |
| Alt headline | Stop Managing Contractors. Start Managing Your Portfolio. | Final |
| Campaign tagline | We Handle the Hard Part. | Final |
| Hero | Your Next Tenant Shouldn't Be Waiting on Five Different Contractors. | Final |
| Parent entity candidate | Metropolitan Heights LLC (DBA) or new LLC per state | Owner decision |

**Independence rule.** PortfolioWorks shares *systems* with DeckCraft Boston and StoneCraft (intake, scheduling, photo documentation, attribution, GHL patterns) but never brand, copy, colors, social handles or cross-references. No "a DeckCraft company." Separate GHL sub-account, pixel, GA4 property, Google Ads account and phone numbers.

## Positioning
**Enemy:** operational friction — not bad contractors. Owners lose time to the gaps *between* trades.

**Category:** done-for-you contractor coordination + general contracting for rental portfolios. Not a handyman, not a referral marketplace, not a property manager.

**Proof architecture (in order of strength):** documented case studies → written line-item scopes → photo closeout records → founder credentials → process transparency → verified testimonials. *Never fabricate any of these.* Until real projects exist, the site leads with process, documentation standard and founder background.

**Message hierarchy**
1. One point of accountability (scope → completion)
2. Written everything (line-item estimates, change orders, completion records)
3. Sequenced trades = fewer vacant days (never "guaranteed")
4. One trade or the whole job — same standard
5. Built by an owner-operator with construction-management training

**Words we use:** scope, schedule, sequence, documented, accountable, line-item, rent-ready, completion record, approval.
**Words we avoid:** "quality workmanship," "best in town," "guaranteed," "24/7" (unless staffed), "licensed in all states," "#1."

## Voice
Institutional, direct, owner-to-owner. Short declarative sentences. Specific deliverables over adjectives. Talk about the unit, the schedule, the record — not about ourselves.

## Color system (implemented in `src/app/globals.css`)
| Token | Hex | Use |
|---|---|---|
| Navy | `#142036` | Primary brand, hero, dark CTAs |
| Navy-2 | `#1D2D4A` | Hover / depth |
| Ink (charcoal) | `#16191D` | Body text, footer, dark bands |
| Slate | `#4B5563` | Secondary text |
| Paper (warm white) | `#F7F4EE` | Canvas |
| Paper-2 | `#EFEAE1` | Alternate section |
| Line | `#DDD6CA` | Rules, borders |
| **Bronze** | `#9C6B3A` | Primary CTA, eyebrows, numerals — accent only (≤10% of surface) |
| Bronze-2 | `#B9864F` | Bronze on dark |
| Bronze-soft | `#F1E6D8` | Notices, tags |

No contractor orange. No clip-art tools. Bronze is the only warm accent.

## Typography
- **Display:** transitional serif (Iowan Old Style → Palatino → Georgia fallback). Swap to a licensed face (e.g., *Tiempos Headline* or *GT Sectra*) or free *Source Serif 4* via `next/font` at deploy.
- **Body/UI:** system sans (Inter if self-hosted).
- **Numerals:** tabular figures in the display serif for prices, KPIs, step numbers.
- Eyebrows: 0.72rem, 0.16em tracking, uppercase, bronze.

## Logo
Mark = three ascending bars (portfolio growth / buildings) in a navy square, first bar bronze. Wordmark "PortfolioWorks" in display serif + "CONTRACTING & PROPERTY SERVICES" small caps. SVG in `src/components/ui.tsx` (`<Logo/>`) and `src/app/icon.svg`. Commission a designer to refine before print.

## Components
Square-cornered (2–3px radius) buttons and cards; 1px warm-grey rules; grid-line texture on navy heroes; numbered steps; tables for comparison; "Photo needed" placeholders that are visibly placeholders.

## Photography direction (shot list)
1. Coordinator walking a vacant unit with tablet (hero/portal)
2. Before/after pairs per room type: kitchen, bath, living, bedroom, hallway — same angle, same lens
3. Crews mid-task in clean PPE, lead-safe containment on a pre-1978 job
4. Exterior: Boston triple-decker, Quincy brick walk-up, Palm Beach condo (FL only after launch)
5. Founder portrait: on site, natural light, no hard hat posing
6. Detail shots: floor plan on clipboard, paint schedule, punch list
Release forms from owners for any property shown. No stock photos presented as our work.
