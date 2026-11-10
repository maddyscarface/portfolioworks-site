export type AudienceId = "landlord" | "portfolio-owner" | "property-manager" | "investor" | "broker" | "hoa";

export interface Audience {
  id: AudienceId;
  href: string;
  label: string;
  who: string;
  headline: string;
  sub: string;
  needs: string[];
  howWeHelp: { title: string; body: string }[];
  cta: { label: string; href: string };
  formVariant: "turnover" | "portfolio" | "rehab" | "trade";
  faq: { q: string; a: string }[];
}

export const audiences: Audience[] = [
  {
    id: "landlord",
    href: "/landlords",
    label: "Small Landlords",
    who: "Owners of 1–10 rental units",
    headline: "One contractor you can call for every unit, every turn.",
    sub: "Clear estimates, fast turnovers and repairs between tenants—without managing five trades yourself.",
    needs: ["Fast turnover work", "Repairs between tenants", "Affordable upgrades", "Bathroom and kitchen repairs", "One reliable contractor", "Clear estimates"],
    howWeHelp: [
      { title: "Priced line by line", body: "Every estimate shows each item and its price, so you can approve, defer or remove items yourself." },
      { title: "Photo intake", body: "Send photos and a few details; light turns can often be scoped without a site visit." },
      { title: "Records you keep", body: "Paint colors, flooring products and photos are saved to your property record for the next turn." },
    ],
    cta: { label: "Get Your Unit Ready for the Next Tenant", href: "/request-a-turnover" },
    formVariant: "turnover",
    faq: [
      { q: "I only own two units. Am I too small?", a: "No. Single-unit turnovers are one of our three core offers." },
      { q: "Do you require a contract for every job?", a: "Every job has a written estimate and approval. Repeat clients can move to a standing rate card." },
    ],
  },
  {
    id: "portfolio-owner",
    href: "/portfolio-owners",
    label: "Growing Portfolio Owners",
    who: "Owners of 10–100+ units",
    headline: "Your portfolio needs a system, not another contractor phone number.",
    sub: "Repeatable scopes, consistent pricing and multiple crews coordinated through one account.",
    needs: ["Repeatable scopes", "Multiple crews", "Consistent pricing", "Scheduling", "Vacancy reduction", "Recurring maintenance and improvements", "Portfolio reporting"],
    howWeHelp: [
      { title: "Standard unit packages", body: "Define a light, standard and heavy turn package once; every unit after that is priced from the same sheet." },
      { title: "Portfolio dashboard", body: "Every property, unit, open project and invoice in one portal." },
      { title: "Cost-per-unit reporting", body: "Spend by property, unit and scope category to support budgeting." },
    ],
    cta: { label: "Request a Portfolio Partnership Consultation", href: "/portfolio-programs#consultation" },
    formVariant: "portfolio",
    faq: [{ q: "How do we start?", a: "With one pilot unit. If it meets your standard, we set up a rate card and approved-vendor relationship." }],
  },
  {
    id: "property-manager",
    href: "/property-managers",
    label: "Property Management Firms",
    who: "Third-party managers overseeing many owners and units",
    headline: "One partner for repairs, turnovers and renovations.",
    sub: "Easy work requests, centralized documentation and consistent invoicing across every owner you manage.",
    needs: ["Reliable vendor network", "Rapid communication", "Easy work requests", "Centralized documentation", "Consistent invoicing", "Tenant coordination", "One accountable point of contact"],
    howWeHelp: [
      { title: "Owner-separated records", body: "Properties, approvals and invoices are organized by owner so you can pass costs through cleanly." },
      { title: "Approval thresholds", body: "Set dollar limits for what your team can approve vs. what requires owner sign-off." },
      { title: "Tenant coordination", body: "Access windows and tenant notices are scheduled through your team, documented in the job record." },
    ],
    cta: { label: "Request a Portfolio Partnership Consultation", href: "/portfolio-programs#consultation" },
    formVariant: "portfolio",
    faq: [
      { q: "Can invoices be issued per owner?", a: "Yes. Each property is linked to an owner entity and invoices are issued against the right one." },
      { q: "Will you complete our vendor onboarding?", a: "Yes—W-9, certificates of insurance and any vendor platform registration you require." },
    ],
  },
  {
    id: "investor",
    href: "/real-estate-investors",
    label: "Multifamily & Value-Add Investors",
    who: "Value-add investors, syndicators and small/midsize operators",
    headline: "Bought a value-add property? Build the rehab plan before the delays begin.",
    sub: "Unit renovation programs, capex planning and cost-per-unit controls for repositioning.",
    needs: ["Unit renovation programs", "Capex planning", "Repositioning scopes", "Budget and schedule management", "Cost-per-unit controls", "Multiple simultaneous renovations"],
    howWeHelp: [
      { title: "Pre-close scoping", body: "Walk the property before closing and receive a scope and budget you can underwrite against." },
      { title: "Unit upgrade packages", body: "One fixed price per unit type, applied as units turn." },
      { title: "Milestone reporting", body: "Weekly photo reports, budget vs. actual and change-order log for your investors." },
    ],
    cta: { label: "Turn Your Renovation Plan Into an Executable Scope", href: "/request-a-renovation-estimate" },
    formVariant: "rehab",
    faq: [{ q: "Do you work on lender draw schedules?", a: "Yes. Payment milestones can be structured around your lender's draw inspection process." }],
  },
  {
    id: "broker",
    href: "/real-estate-investors#brokers",
    label: "Realtors & Investor-Facing Brokers",
    who: "Pre-listing, post-acquisition and investor referrals",
    headline: "A renovation partner you can hand your investor clients to.",
    sub: "Pre-listing improvements, post-acquisition repair scopes and rental upgrades—with your client kept in the loop.",
    needs: ["Pre-listing improvements", "Post-acquisition repairs", "Investor referrals", "Rental property upgrades"],
    howWeHelp: [
      { title: "Fast pre-listing scopes", body: "Prioritized list of what to fix before listing, priced so your seller can decide." },
      { title: "Buyer-side scopes", body: "Repair estimates during due diligence to support your buyer's numbers." },
    ],
    cta: { label: "Refer a Client", href: "/contact?type=broker" },
    formVariant: "rehab",
    faq: [{ q: "Do you pay referral fees?", a: "Referral arrangements must comply with real estate licensing rules in each state; we discuss what is permitted directly." }],
  },
  {
    id: "hoa",
    href: "/hoa-condos",
    label: "HOAs & Condo Associations",
    who: "Boards and management companies",
    headline: "Common-area work and unit-owner renovations, coordinated with the association.",
    sub: "Common-area repairs, unit renovation coordination, vendor administration and improvement projects.",
    needs: ["Common-area repairs", "Unit-owner renovation coordination", "Vendor administration", "Property improvement work"],
    howWeHelp: [
      { title: "Association-ready paperwork", body: "Certificates of insurance naming the association, work-hour compliance and elevator/loading reservations." },
      { title: "Board-friendly proposals", body: "Comparable options with clear scopes so boards can vote on a decision, not a guess." },
    ],
    cta: { label: "Request a Property Walkthrough", href: "/request-a-property-walkthrough" },
    formVariant: "portfolio",
    faq: [{ q: "Can you work with unit owners directly?", a: "Yes, under the association's rules for contractor access and approvals." }],
  },
];

export const getAudience = (id: AudienceId) => audiences.find((a) => a.id === id)!;
