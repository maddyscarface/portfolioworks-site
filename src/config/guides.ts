/**
 * Published operational guides for /resources/[slug].
 * Florida and Maine articles are noindex and omitted from the sitemap until those markets launch.
 * No vacancy-duration, savings or capacity claims. Pricing mentions are planning assumptions only.
 */
import { briefs, type Brief } from "@/config/seo-briefs";

export interface GuideSection {
  h2: string;
  body: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Document title (<=60 characters), used in metadata. */
  seoTitle: string;
  description: string;
  h1: string;
  primaryKw: string;
  secondary: string[];
  intent: Brief["intent"];
  audience: string;
  market: Brief["market"];
  datePublished: string;
  answer: string;
  sections: GuideSection[];
  links: { href: string; label: string }[];
  faq?: { q: string; a: string }[];
  /** Default true. FL/ME market articles stay noindex until those markets launch. */
  indexable?: boolean;
}

const DATE = "2026-11-13";

const PHASE3: Guide[] = [
  {
    slug: "what-is-included-in-a-rental-unit-turnover",
    title: "What Is Included in a Rental Unit Turnover?",
    seoTitle: "What's in a Rental Unit Turnover? | PortfolioWorks",
    description: "A practical breakdown of a Greater Boston rental turnover: access, inspection, trades sequence, cleaning and documented closeout.",
    h1: "What is included in a rental unit turnover?",
    primaryKw: "rental unit turnover checklist",
    secondary: ["apartment make-ready Boston", "unit turnover coordination"],
    intent: "informational",
    audience: "Landlords and property managers",
    market: "MA",
    datePublished: DATE,
    answer:
      "A rental unit turnover is the coordinated work that takes a unit from move-out to rent-ready: access and inspection, a priced scope, sequenced trades, cleaning and a documented handoff. The exact line items change with condition, but the process should be the same on every unit so nothing is left to a text thread.",
    sections: [
      {
        h2: "Start with access, not with a paint date",
        body: [
          "Work cannot start until keys, codes, parking and tenant-notice windows are confirmed. For occupied or overlapping moves, the owner or manager should confirm who meets the crew and how after-hours access is handled.",
          "In Greater Boston walk-ups and triple-deckers, also note stair width, dumpster rules and where materials can be staged. Those details belong in the job record before anyone orders flooring.",
        ],
        list: [
          "Key, fob or lockbox location and a backup contact",
          "Parking, loading and dumpster constraints",
          "Known lead-safe or pre-1978 conditions",
          "Preferred work hours and tenant-notice requirements",
        ],
      },
      {
        h2: "A readiness checklist, room by room",
        body: [
          "A useful turnover checklist is a condition survey, not a generic punch list. Photograph each room, then classify work as make-ready (normal wear), tenant damage or deferred capital work. Deposit decisions stay with the owner; the contractor documents what is found.",
        ],
        list: [
          "Walls, ceilings and trim: holes, stains, failed patches",
          "Floors: damage, transitions, loose boards or lifted plank",
          "Kitchen: cabinets, hardware, appliances, plumbing leaks",
          "Bathrooms: caulk, grout, fixtures, ventilation, moisture",
          "Doors, locks, blinds, smoke and CO devices, outlets and covers",
        ],
      },
      {
        h2: "A trade sequence that protects the finish",
        body: [
          "Most units follow the same order: repairs and drywall, then paint, then flooring, then fixtures and hardware, then cleaning and a punch walk. Flooring before paint, or a plumber after the vanity is set, is how jobs lose days.",
          "PortfolioWorks sequences those trades under one coordinator. We do not advertise a fixed number of calendar days, because access, material lead times and unexpected conditions change the schedule. A written scope states the planned window for that unit.",
        ],
      },
      {
        h2: "Vacancy handoff and photo documentation",
        body: [
          "Closeout should leave the next person — a leasing agent, a new tenant or the next turnover crew — a complete record: before and after photos, work performed against the approved line items, signed change orders, and paint colors and product SKUs.",
          "That record is what makes the following turn faster. It is not a marketing gallery and is not published without permission.",
        ],
      },
    ],
    links: [
      { href: "/rental-turnovers", label: "Rental unit turnovers" },
      { href: "/request-a-turnover", label: "Plan a unit turnover" },
      { href: "/resources/documenting-unit-closeout", label: "Documenting unit closeout" },
      { href: "/unit-turn-estimator", label: "Unit turn scope planner" },
    ],
    faq: [
      { q: "Is cleaning included?", a: "Cleaning is typically coordinated as a closing line item once construction work is complete. Confirm it in the written scope so it is not assumed." },
      { q: "Do you guarantee a rent-ready date?", a: "No. We plan a schedule from the approved scope and known access, and we update you in writing if conditions change. We do not advertise a staffed turnaround time." },
    ],
  },
  {
    slug: "planning-a-30-day-make-ready",
    title: "Planning a 30-Day Make-Ready for a Boston Rental",
    seoTitle: "Planning a 30-Day Make-Ready | PortfolioWorks",
    description: "A working calendar for a 30-day unit turnover in Greater Boston, including inspection, materials, trades and closeout — without promising a fixed turnaround.",
    h1: "Planning a 30-day make-ready",
    primaryKw: "30 day rental make ready",
    secondary: ["boston lease turnover", "unit turnover coordination"],
    intent: "informational",
    audience: "Boston landlords and property managers",
    market: "MA",
    datePublished: DATE,
    answer:
      "A 30-day make-ready is a planning calendar, not a guarantee. Working backward from the target move-in date, reserve time for inspection and scope approval, material lead times, sequenced trades, cleaning and a punch walk. In Boston, also leave room for pre-1978 lead-safe practices and mid-summer contractor demand.",
    sections: [
      {
        h2: "Work backward from the move-in date",
        body: [
          "Write the target handoff date first, then place the last responsible moment for each step in front of it. A typical planning split for a moderate turn is: days 1–3 inspection and photos, days 3–7 written scope and owner approval, days 7–10 material orders, days 10–24 on-site work, days 24–28 cleaning and punch, days 28–30 closeout record.",
          "Heavy work — full kitchen or bath, subfloor repair, or extensive plaster — often needs a longer window. Treat 30 days as a planning frame for a standard turn, not a promise for every unit.",
        ],
      },
      {
        h2: "Lock the scope before you lock the crew",
        body: [
          "The schedule only holds if the scope is approved. Hidden damage, deferred capital items and late finish changes are the usual reasons a 30-day plan slips. Require written approval, including allowances and exclusions, before materials are ordered.",
        ],
      },
      {
        h2: "Boston-specific timing pressures",
        body: [
          "Many Boston-area leases still cluster around September 1, which compresses contractor calendars in June through August. If your unit turns in that window, start scoping earlier than 30 days whenever the move-out date is known.",
          "Pre-1978 buildings may require lead-safe work practices that add setup and cleaning time. Those steps belong on the calendar, not as an afterthought on day 20.",
        ],
      },
      {
        h2: "What this calendar does not promise",
        body: [
          "A planning calendar is not a staffed emergency service and not a guarantee that a unit will lease on a given date. Material delays, access problems and change orders can extend the work. When that happens, the coordinator should update the written schedule rather than absorb the change silently.",
        ],
      },
    ],
    links: [
      { href: "/rental-turnovers", label: "Rental turnovers" },
      { href: "/resources/september-1-boston-turnover-planning", label: "September 1 planning" },
      { href: "/request-a-turnover", label: "Plan a unit turnover" },
    ],
  },
  {
    slug: "maintenance-vs-capital-improvements",
    title: "Maintenance vs. Capital Improvements on a Rental Property",
    seoTitle: "Maintenance vs. Capital Improvements | PortfolioWorks",
    description: "How landlords can separate routine maintenance from capital improvements when scoping rental work, without treating this as tax or legal advice.",
    h1: "Maintenance vs. capital improvements",
    primaryKw: "maintenance vs capital improvements rental",
    secondary: ["rental property rehab Boston", "property portfolio maintenance Boston"],
    intent: "informational",
    audience: "Landlords and portfolio owners",
    market: "all",
    datePublished: DATE,
    answer:
      "Maintenance keeps an existing finish or system working; a capital improvement replaces or upgrades it in a way that typically extends useful life or changes the unit. The distinction matters for budgeting, approvals and how work is packaged in a scope. This is an operational guide, not tax, accounting or legal advice.",
    sections: [
      {
        h2: "A practical field test",
        body: [
          "If the work restores a room to its current standard — patching, repainting, recaulking, replacing a failed faucet with a like fixture, swapping a damaged LVP plank — treat it as maintenance or make-ready. If the work changes the standard — a new kitchen layout, a full bath remodel, a new flooring system throughout the unit — treat it as a capital project with its own scope, allowances and approvals.",
        ],
      },
      {
        h2: "Why the split belongs in the scope",
        body: [
          "Mixing a capital upgrade into a five-day turnover is how schedules break. Owners also need a clean record of what was maintenance versus what was a planned improvement, especially when multiple units share a finish standard.",
          "PortfolioWorks will separate the two on the written scope when both appear on the same unit, so approval and billing stay clear. Your accountant or attorney should advise on tax treatment; we do not.",
        ],
      },
      {
        h2: "Examples landlords often mix up",
        body: [
          "Repainting a unit in the existing color is usually maintenance. Changing a kitchen from dated cabinets to a new layout is a capital improvement. Replacing failed caulk is maintenance. Rebuilding a shower with a new waterproofing system is capital work. When in doubt, describe the work plainly in the scope and let the owner classify it for their books.",
        ],
        list: [
          "Touch-up paint and plaster repair — typically maintenance",
          "Like-for-like fixture replacement — typically maintenance",
          "Full kitchen or bath remodel — typically capital",
          "New flooring system across a unit — typically capital",
          "Subfloor repair discovered during a turn — often a change order, classified with the owner",
        ],
      },
    ],
    links: [
      { href: "/rental-renovations", label: "Rental renovations" },
      { href: "/services/capital-improvements", label: "Capital improvement programs" },
      { href: "/services/property-maintenance", label: "Property maintenance" },
    ],
  },
  {
    slug: "commercial-landlord-renovation-scope",
    title: "How to Scope a Commercial Landlord Renovation",
    seoTitle: "Commercial Landlord Renovation Scope | PortfolioWorks",
    description: "A structured way for landlords and managers to define renovation scope: rooms, trades, materials, approvals and change-order rules.",
    h1: "Commercial landlord renovation scope",
    primaryKw: "commercial landlord renovation scope",
    secondary: ["multifamily renovations Boston", "investment property renovation"],
    intent: "commercial",
    audience: "Landlords, investors and property managers",
    market: "all",
    datePublished: DATE,
    answer:
      "A usable renovation scope lists rooms, trades, quantities, material specifications, allowances, exclusions, approval paths and change-order rules. It should come from a site walk or a thorough photo survey, not from a single lump-sum number. Until those items are written and approved, any figure is a planning assumption.",
    sections: [
      {
        h2: "Validate the scope before you bid the work",
        body: [
          "Walk the unit or building with a consistent survey: existing conditions, hidden-risk areas (wet rooms, aging electrical, plaster), access constraints and anything the owner wants left untouched. Photograph and measure. Only then write line items.",
          "If something cannot be confirmed until demolition, call it an allowance or an exclusion. Silent assumptions are how change-order fights start.",
        ],
      },
      {
        h2: "Specify materials, not just finishes in conversation",
        body: [
          "A scope that says “nice LVP” is not a specification. Record product, grade or allowance, color and who is authorized to approve substitutions. The same standard should be reusable on later units in the portfolio.",
        ],
      },
      {
        h2: "Approvals and change orders",
        body: [
          "Name who can approve the original scope and who can approve changes, including any dollar threshold. Work outside the approved scope should pause until a written change order describes the new work, price and schedule impact.",
          "That rule protects both sides. It is also the only way a portfolio owner can compare one project to the next.",
        ],
      },
      {
        h2: "Trades and coordination",
        body: [
          "List each trade, whether it is self-performed or subcontracted, and any legally required licenses (plumbing, electrical, gas, HVAC). The general contractor or coordinator owns the sequence. The owner should not have to schedule the plumber around the painter.",
        ],
      },
    ],
    links: [
      { href: "/rental-renovations", label: "Rental property renovations" },
      { href: "/request-a-renovation-estimate", label: "Request a renovation estimate" },
      { href: "/resources/change-orders-explained", label: "Change orders explained" },
      { href: "/general-contracting", label: "General contracting" },
    ],
  },
  {
    slug: "documenting-unit-closeout",
    title: "Documenting Unit Closeout After a Turnover or Renovation",
    seoTitle: "Documenting Unit Closeout | PortfolioWorks",
    description: "What a complete unit closeout record should contain: photos, approved work, change orders, product SKUs and a clean handoff to leasing or the next turn.",
    h1: "Documenting unit closeout",
    primaryKw: "rental unit closeout documentation",
    secondary: ["turnover completion record", "unit turnover coordination"],
    intent: "informational",
    audience: "Landlords and property managers",
    market: "all",
    datePublished: DATE,
    answer:
      "A complete closeout record ties the finished unit back to the approved scope. It includes dated before, progress and after photos, work performed, signed change orders, paint colors and product SKUs, and the invoice. The record belongs in the property file so the next turnover does not start from memory.",
    sections: [
      {
        h2: "Photograph as if the next crew has never seen the unit",
        body: [
          "Take dated photos at move-out, during concealed work (for example, waterproofing or subfloor) and at completion, room by room and in consistent orientations. Close-ups of issues and of completed repairs matter as much as wide shots.",
          "These photos are an operations record. They are not published as project marketing unless the owner gives permission.",
        ],
      },
      {
        h2: "Write down the products, not just the rooms",
        body: [
          "Paint color, sheen and brand, flooring SKU, grout color, fixture models and hardware finishes should be stored with the unit. Matching a single damaged plank or a hallway touch-up a year later depends on that list.",
        ],
      },
      {
        h2: "Close the paper trail",
        body: [
          "The invoice should map to the approved line items and any signed change orders. Open punch items should be listed with a planned close date, not left in a text message. Once the punch is complete, the job record is marked closed and delivered to the owner or manager.",
        ],
      },
    ],
    links: [
      { href: "/rental-turnovers", label: "Rental turnovers" },
      { href: "/how-it-works", label: "How work runs" },
      { href: "/request-a-turnover", label: "Plan a unit turnover" },
    ],
  },
  {
    slug: "comparing-multiple-trade-bids",
    title: "Comparing Multiple Trade Bids on a Rental Project",
    seoTitle: "Comparing Trade Bids on a Rental | PortfolioWorks",
    description: "How to compare painter, flooring and trade bids on the same rental unit without mixing scope, exclusions or schedule assumptions.",
    h1: "Comparing multiple trade bids",
    primaryKw: "compare contractor bids rental",
    secondary: ["landlord renovation contractors Massachusetts", "unit turnover coordination"],
    intent: "informational",
    audience: "Landlords and property managers",
    market: "all",
    datePublished: DATE,
    answer:
      "Compare trade bids only after you line up scope, exclusions, materials, schedule assumptions and change-order rules. A lower number is not a lower cost if it omits prep, disposal, trim or a second coat. Many owners eventually prefer one coordinated scope to five unrelated quotes.",
    sections: [
      {
        h2: "Put every bid against the same scope",
        body: [
          "Write the scope first — rooms, quantities, prep standard, materials or allowances, cleanup and whether permits or licensed trades are included. Send that document to every bidder. If a bid comes back with different inclusions, recast it before you compare prices.",
        ],
      },
      {
        h2: "Read the exclusions as carefully as the total",
        body: [
          "Common omissions include furniture moving, disposal, trim and transitions, primer, hardware, appliance disconnection, parking or dumpster fees, and lead-safe setup on pre-1978 work. Those items will reappear later, usually as extras.",
        ],
      },
      {
        h2: "Price is only one column",
        body: [
          "Ask how the bidder will document conditions, who owns the schedule if trades overlap, and how change orders are written. A coordinated contractor can still use specialty trades; the difference is that one party owns the sequence and the closeout record.",
        ],
      },
      {
        h2: "When a single scope is the better comparison",
        body: [
          "If you are already collecting four or five bids to make one unit rent-ready, the administrative cost is part of the project. A single line-item scope covering every trade is often the clearer comparison — not because it is always cheaper, but because the gaps between trades are priced and scheduled in one place.",
        ],
      },
    ],
    links: [
      { href: "/rental-renovations", label: "Rental renovations" },
      { href: "/request-a-renovation-estimate", label: "Request a renovation estimate" },
      { href: "/resources/fixed-price-vs-cost-plus", label: "Choosing a contract type" },
    ],
  },
];

const BRIEF_SECTIONS: Record<string, GuideSection[]> = {
  "rental-turnover-checklist-boston": [
    { h2: "Move-out inspection and a photo standard", body: ["Walk the unit as soon as you have access. Photograph every room in consistent light, plus close-ups of damage, appliances and wet areas. Date the set and store it with the unit file before anyone starts repairs."], list: ["Wide shot and detail shot of each room", "Mechanical closets, basement storage and common meters if relevant", "Existing paint and flooring for later matching"] },
    { h2: "Separate normal wear from damage", body: ["Describe conditions plainly. Owners and managers decide deposits; the contractor’s job is a dated record and a priced scope that can be split between make-ready work and tenant-damage work if you need that split."] },
    { h2: "Sequence the trades", body: ["Repairs and plaster, then paint, then flooring, then fixtures, then cleaning. Write that order into the schedule so one trade is not standing on another trade’s finish."] },
    { h2: "Pre-1978 and September planning", body: ["Much of Greater Boston’s rental stock predates 1978, so lead-safe practices may apply when painted surfaces are disturbed. Confirm requirements with qualified professionals. If the unit must be ready near September 1, start the scope well before mid-summer."] },
  ],
  "how-much-does-apartment-turnover-cost-boston": [
    { h2: "Cost is driven by scope, not by a single average", body: ["A light refresh (paint and minor repairs) is a different job from a standard turn (paint, flooring in some rooms, fixture refresh) or a heavy turn (kitchen or bath work, subfloor, extensive plaster). Unit size, access and finish standard also move the number."] },
    { h2: "Price line items, then decide what can wait", body: ["A line-item scope lets you defer cosmetic work without losing the make-ready path. Lump-sum bids hide that choice."] },
    { h2: "Plan the scope first, then get a written price", body: ["The Unit Turn Scope Planner lists the trades, timing and access notes for a unit. It shows no prices: pricing comes only in a written proposal. Hidden conditions, permits and material choices are confirmed in a written scope after review of the unit."] },
  ],
  "september-1-boston-turnover-planning": [
    { h2: "Why the calendar compresses", body: ["When many leases end in late August, contractors, flooring suppliers and cleaners book earlier than owners expect. Waiting until mid-August to scope a heavy turn is how units miss the next lease start."] },
    { h2: "A backward plan from August 31", body: ["Aim to lock scopes in June where you already know the move-out, pre-order long-lead flooring and fixtures, and sequence units by incoming move-in date. Units that need kitchen or bath work should start first."] },
    { h2: "Communicate early with incoming tenants", body: ["If work might overlap a move-in, say so in writing. A documented delay is better than a surprise on day one. None of this guarantees a lease date; it only reduces avoidable chaos."] },
  ],
  "lead-safe-renovation-rental-massachusetts": [
    { h2: "Which work is in scope", body: ["Work that disturbs painted surfaces in pre-1978 housing generally falls under the EPA Renovation, Repair and Painting (RRP) rule and Massachusetts lead-safe renovation requirements. Confirm what applies to each job with qualified professionals. This page is general information, not a compliance determination."] },
    { h2: "What owners should expect to see", body: ["Certified renovator practices, containment where required, and documentation in the job file. These steps can add setup and cleaning time to a turnover; they should appear in the schedule rather than being improvised on site."] },
    { h2: "Turnover implications", body: ["If a unit is pre-1978 and the scope includes sanding, cutting or extensive scraping, say so in the intake. Photo-only scopes may be enough for a light turn but are often not enough to confirm lead-safe methods."] },
  ],
  "property-manager-vendor-management": [
    { h2: "The cost of vendor sprawl", body: ["Each additional vendor is another intake form, insurance file, invoice format and follow-up thread. Consolidating recurring turnover and repair work under one accountable contractor reduces coordination time; it does not mean fewer trades on site."] },
    { h2: "Set rules before the next vacancy", body: ["Agree approval thresholds, a rate card or standard unit packages, photo closeout standards and how urgent versus planned work is requested. Then test the relationship on a pilot unit before expanding."] },
    { h2: "Measure what you can actually see", body: ["Useful vendor measures include scope accuracy, schedule updates, change-order discipline and completeness of the closeout record. Avoid promising or demanding a vacancy reduction you cannot control."] },
  ],
  "standard-unit-turn-packages": [
    { h2: "Define the finish standard once", body: ["A package names paint, flooring, hardware, fixtures and what is in a light, standard or heavy turn. Repeat units can then be priced and scheduled from a known baseline instead of a new invention each vacancy."] },
    { h2: "Price exceptions in the open", body: ["Damage beyond the package, capital upgrades and hidden conditions are change orders or a different package, not silent extras. That is how a portfolio keeps cost-per-unit comparable from one building to the next."] },
  ],
  "value-add-apartment-rehab-scope": [
    { h2: "Build the scope from the building", body: ["A lender-ready rehab scope is organized by unit type, room and trade, with quantities, allowances, contingency and a milestone schedule. It should come from a site walk, not only from a spreadsheet assumption."] },
    { h2: "Call out uncertainty", body: ["Where conditions cannot be known until demolition, use allowances and a change-order rule. A single lump sum with no exclusions is not more precise; it is less transparent."] },
  ],
  "lvp-vs-hardwood-rentals": [
    { h2: "What usually wins in a rental", body: ["Commercial-grade LVP is typically the most practical rental floor because it resists moisture better than many wood finishes and can be repaired plank by plank if the product is recorded. It is a planning recommendation, not a rule for every building."] },
    { h2: "When refinishing hardwood makes sense", body: ["If a wear layer remains and the unit’s rent supports a higher finish, refinishing can cost less than replacement and keep original character. Confirm condition before you budget a full tear-out."] },
  ],
  "rental-bathroom-refresh-vs-remodel": [
    { h2: "Choose a tier from the substrate, not from a catalog photo", body: ["Refresh when finishes are tired but waterproofing and structure are sound. Upgrade when fixtures or a vanity have failed. Remodel when there is water damage, failed waterproofing or a documented rent case for a full reset."] },
    { h2: "Look for hidden damage early", body: ["Staining, soft floors, poor ventilation and failed caulk at tub edges are reasons to inspect further before you promise a refresh-only budget. Unexpected repair work should be written as a change order."] },
  ],
  "kitchen-refacing-rental": [
    { h2: "Start with the boxes", body: ["If cabinet boxes are sound, painting or refacing with new doors and hardware is often the better rental value. Replace when boxes are damaged, poorly laid out or cannot accept a durable work surface."] },
    { h2: "Counters, appliances and layout are separate decisions", body: ["Price them as distinct line items so an owner can keep a working layout and still improve durability. Layout changes belong in a renovation scope, not a weekend refresh."] },
  ],
  "vacancy-cost-calculation": [
    { h2: "The planning formula", body: ["Daily gross rent equivalent is monthly rent × 12 ÷ 365. Multiply by vacant days to see exposure. It is a planning figure only."] },
    { h2: "What the number does not mean", body: ["Shorter renovation time reduces unavailable days; it does not guarantee a lease, a tenant or recovered rent. Leasing time and market conditions sit outside the calculation. Use the vacancy calculator to compare planning scenarios, not to underwrite a return."] },
  ],
  "change-orders-explained": [
    { h2: "What a change order is", body: ["A change order is a written amendment to an approved scope. It describes the new work, the price and the schedule impact, and it should be signed before that work starts."] },
    { h2: "What should trigger one", body: ["Hidden damage, owner-requested upgrades, material substitutions and anything excluded from the original estimate. Verbal adds on site are how invoices turn into disputes."] },
  ],
  "fixed-price-vs-cost-plus": [
    { h2: "Match the contract to the uncertainty", body: ["Fixed price fits definable, inspectable scopes such as a standard turnover. Time-and-materials with a cap fits diagnostic repair. Cost-plus with a guaranteed maximum price fits complex rehabs where conditions are incomplete at signing."] },
    { h2: "Risk should be visible", body: ["If a contractor offers a lump sum on an unseen unit, ask what is excluded. A clear allowance is usually safer than an optimistic total."] },
  ],
  "rental-turnover-west-palm-beach": [
    { h2: "Market status first", body: ["PortfolioWorks is not currently an active vendor in Southeast Florida. The market is licensing-pending: we may review inquiries, but work is not scheduled until licensing and insurance are verified. A Massachusetts credential does not carry over."] },
    { h2: "Association and climate constraints still shape the work", body: ["Condo rules, certificates of insurance, elevator bookings and humidity-appropriate materials are typical planning issues in this market. Build approval time into any future schedule."] },
  ],
  "landlord-renovation-boca-raton": [
    { h2: "This market is not yet active", body: ["Boca Raton sits in PortfolioWorks’ Southeast Florida licensing-pending market. Do not treat this article as an offer of current local contracting. Requests are reviewed for future availability only."] },
    { h2: "Planning notes for owners already in the area", body: ["HOA or condo approval, seasonal turnover timing and Florida licensing checks should be on your list regardless of which contractor you hire."] },
  ],
  "rental-turnover-fort-lauderdale": [
    { h2: "Licensing-pending market", body: ["Fort Lauderdale is listed for planning education only. PortfolioWorks does not currently market or schedule work there as an active service area."] },
    { h2: "Association logistics", body: ["A practical checklist still includes COI, elevator reservations, work-hour limits and moisture-tolerant finishes. Confirm each building’s rules in writing before a crew is booked."] },
  ],
  "condo-renovation-delray-beach": [
    { h2: "Not an active PortfolioWorks market", body: ["Delray Beach is in the licensing-pending Southeast Florida market and is not presented as a current service offering."] },
    { h2: "Association applications", body: ["Most associations want a scope, contractor insurance and work-hour commitments before approving a renovation. Submit those documents early, whichever contractor you use."] },
  ],
  "rental-property-repairs-kennebunk": [
    { h2: "Southern Maine is under evaluation", body: ["PortfolioWorks reviews inquiries in Kennebunk and Kennebunkport but does not currently market the area as an active, staffed service market. Coverage beyond those towns is verified before it is advertised."] },
    { h2: "Season and contract notes", body: ["Exterior and weather-sensitive work belongs in the shoulder seasons. Maine’s Home Construction Contracts Act requires written contracts with specific terms for residential jobs over $3,000. This is general information, not legal advice."] },
  ],
  "hoa-common-area-maintenance-plan": [
    { h2: "Inventory before you bid", body: ["List common elements, rate their condition and estimate remaining life. Then schedule work by priority and budget year instead of reacting to the next failed stair tread."] },
    { h2: "One coordinated scope reduces board administration", body: ["Recurring painting, carpentry and related repairs can sit under one contractor relationship with a photo record and a clear approval path, rather than a new vendor search each season."] },
  ],
  "pilot-unit-vendor-trial": [
    { h2: "Define success before the job starts", body: ["Agree what you will score: scope accuracy, communication, schedule updates, change-order discipline and closeout documentation. A cheap pilot that fails those tests is still an expensive experiment."] },
    { h2: "Choose a representative unit", body: ["Pick a unit that reflects your typical turnover, not the easiest or the worst outlier, so the result tells you something about the rest of the portfolio."] },
    { h2: "Only then talk about a longer agreement", body: ["A rate card, standard packages and a master service agreement should follow a successful pilot, not precede it."] },
  ],
};

const BRIEF_LINK_LABEL: Record<string, string> = {
  "/rental-turnovers": "Rental turnovers",
  "/unit-turn-estimator": "Unit turn scope planner",
  "/portfolio-programs": "Portfolio programs",
  "/portfolio-savings-calculator": "Vacancy and portfolio planner",
  "/services/painting-drywall": "Painting and drywall",
  "/markets/massachusetts": "Greater Boston market",
  "/property-managers": "Property managers",
  "/portfolio-owners": "Portfolio owners",
  "/services/capital-improvements": "Capital improvements",
  "/services/full-rehab": "Full rehab",
  "/lp/value-add-rehab": "Value-add renovation request",
  "/services/flooring": "Flooring",
  "/services/bathroom-remodeling": "Bathroom remodeling",
  "/services/kitchen-remodeling": "Kitchen remodeling",
  "/general-contracting": "General contracting",
  "/markets/florida": "Southeast Florida (licensing pending)",
  "/markets/florida/boca-raton": "Boca Raton (licensing pending)",
  "/markets/florida/fort-lauderdale": "Fort Lauderdale (licensing pending)",
  "/hoa-condos": "HOAs and condos",
  "/markets/florida/delray-beach": "Delray Beach (licensing pending)",
  "/markets/maine": "Southern Maine (under evaluation)",
  "/lp/portfolio-partnership": "Portfolio program consultation",
};


const GUIDE_SEO: Record<string, { title: string; description?: string }> = {
  "rental-turnover-checklist-boston": {
    title: "Greater Boston Rental Turnover Checklist | PortfolioWorks",
    description: "A Greater Boston rental turnover covers inspection, a priced scope, sequenced trades, cleaning and closeout, with lead-safe planning on pre-1978 units.",
  },
  "how-much-does-apartment-turnover-cost-boston": {
    title: "Apartment Turnover Cost in Boston | PortfolioWorks",
    description: "Apartment turnover cost in Boston depends on scope tier, unit size, damage and finishes. Plan the scope with our planner, then request a written proposal.",
  },
  "september-1-boston-turnover-planning": {
    title: "Planning a September 1 Boston Turnover | PortfolioWorks",
    description: "Many Boston leases end August 31, so turnover capacity books early. This guide covers a backward calendar for scoping, materials and sequencing units.",
  },
  "lead-safe-renovation-rental-massachusetts": {
    title: "Lead-Safe Renovation for MA Rentals | PortfolioWorks",
    description: "Work that disturbs paint in pre-1978 Massachusetts rentals may fall under EPA RRP and lead-safe rules. Confirm requirements on each job.",
  },
  "property-manager-vendor-management": {
    title: "Cut Vendor Coordination Time | PortfolioWorks",
    description: "Property managers can reduce vendor sprawl by consolidating recurring work, setting approval thresholds and requiring photo-documented closeout.",
  },
  "standard-unit-turn-packages": {
    title: "Standard Unit Turn Packages | PortfolioWorks",
    description: "A standard turn package defines finishes, scope tiers and pricing once, then applies them across units so budgeting, approvals and touch-ups stay consistent.",
  },
  "value-add-apartment-rehab-scope": {
    title: "Value-Add Apartment Rehab Scope | PortfolioWorks",
    description: "A lender-ready rehab scope breaks work down by unit, room and trade, with quantities, allowances, contingency and a milestone schedule built from a site walk.",
  },
  "lvp-vs-hardwood-rentals": {
    title: "LVP vs. Hardwood for Rental Units | PortfolioWorks",
    description: "Compare LVP and hardwood refinishing for rentals, including cost, water resistance, plank-by-plank repair and when existing hardwood is still worth refinishing.",
  },
  "rental-bathroom-refresh-vs-remodel": {
    title: "Rental Bathroom: Refresh or Remodel? | PortfolioWorks",
    description: "Choose a bathroom refresh, fixture upgrade or full remodel based on substrate condition, water damage and whether the rent supports a larger renovation scope.",
  },
  "kitchen-refacing-rental": {
    title: "Kitchen Refacing vs. Replacement | PortfolioWorks",
    description: "If cabinet boxes are sound, refacing or painting with new doors is often the best rental value. Replace the kitchen only when boxes or layout will not work.",
  },
  "vacancy-cost-calculation": {
    title: "Calculating Vacant Rental Unit Cost | PortfolioWorks",
    description: "Daily gross rent equivalent equals monthly rent times 12, divided by 365. Multiply by vacant days for a planning figure only, not a promised lease date.",
  },
  "change-orders-explained": {
    title: "Change Orders for Rental Owners | PortfolioWorks",
    description: "A change order is a written amendment covering new work, price and schedule impact. Get a signed change order before work outside the approved estimate starts.",
  },
  "fixed-price-vs-cost-plus": {
    title: "Choosing a Renovation Contract Type | PortfolioWorks",
    description: "Fixed price fits definable scopes; time-and-materials with a cap fits diagnostic work; cost-plus with a guaranteed maximum price can fit uncertain rehabs.",
  },
  "rental-turnover-west-palm-beach": {
    title: "West Palm Beach Rental Turnovers | PortfolioWorks",
    description: "West Palm Beach turnovers often involve condo association rules, insurance certificates and moisture-appropriate materials. This market is not yet active.",
  },
  "landlord-renovation-boca-raton": {
    title: "Renovating a Rental in Boca Raton | PortfolioWorks",
    description: "Plan Boca Raton rental renovations around HOA or condo approval, seasonal cycles and Florida licensing. This market is not active until licensing is verified.",
  },
  "rental-turnover-fort-lauderdale": {
    title: "Fort Lauderdale Rental Turnovers | PortfolioWorks",
    description: "Fort Lauderdale turnovers should plan for association insurance, elevator bookings, work-hour limits and humidity-tolerant finishes. This market is not active.",
  },
  "condo-renovation-delray-beach": {
    title: "Delray Beach Condo Renovation | PortfolioWorks",
    description: "Most Delray Beach associations require an application, contractor insurance and work-hour compliance before renovation starts. This market is not yet active.",
  },
  "rental-property-repairs-kennebunk": {
    title: "Kennebunk Rental Property Repairs | PortfolioWorks",
    description: "Kennebunk rental and seasonal repairs should follow shoulder-season windows for exterior work. Southern Maine is under evaluation and is not an active market.",
  },
  "hoa-common-area-maintenance-plan": {
    title: "HOA Common-Area Maintenance Plan | PortfolioWorks",
    description: "An HOA maintenance plan inventories common elements, rates condition and schedules repairs by priority and budget year under one coordinated scope.",
  },
  "pilot-unit-vendor-trial": {
    title: "Start New Vendors With a Pilot Unit | PortfolioWorks",
    description: "A pilot unit tests a vendor's scoping, communication, schedule and documentation on real work before a portfolio commitment. Define success criteria first.",
  },
};

function briefToGuide(b: Brief): Guide {
  const inactive = b.market === "FL" || b.market === "ME";
  const seo = GUIDE_SEO[b.slug];
  if (!seo?.title || !seo.description) {
    throw new Error(`Missing GUIDE_SEO title/description for ${b.slug}`);
  }
  return {
    slug: b.slug,
    title: b.title,
    seoTitle: seo.title,
    description: seo.description,
    h1: b.title.replace(/:.*$/, "").trim(),
    primaryKw: b.primaryKw,
    secondary: b.secondary,
    intent: b.intent,
    audience: b.audience,
    market: b.market,
    datePublished: DATE,
    answer: b.answer,
    sections: BRIEF_SECTIONS[b.slug] ?? b.outline.map((h) => ({ h2: h, body: [b.answer] })),
    links: b.links.map((href) => ({ href, label: BRIEF_LINK_LABEL[href] ?? href })),
    indexable: !inactive,
  };
}

export const guides: Guide[] = [
  ...PHASE3,
  ...briefs.map(briefToGuide),
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function publishedGuides(): Guide[] {
  return guides.filter((g) => g.indexable !== false);
}

export function allGuides(): Guide[] {
  return guides;
}
