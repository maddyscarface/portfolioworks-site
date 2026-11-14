import Link from "next/link";
import Image from "next/image";
import { site, founder, verifiedFounderCredentials } from "@/config/site";
import { photos, SERVICE_PHOTO, type PhotoKey } from "@/config/photos";
import { services } from "@/config/services";
import { markets } from "@/config/markets";
import { Btn, Check, Container, CtaBand, Faq, FaqJsonLd, Heading, IllustrativeNote, Photo, Placeholder, Section } from "@/components/ui";
import LeadForm from "@/components/LeadForm";
import { TurnoverEstimator } from "@/components/Tools";
import { CASE_STUDY_SECTIONS } from "@/config/case-studies";

const pains = [
  ["Calling five contractors", "One for paint, one for floors, one for the bathroom, a handyman for everything else—and a cleaner to finish."],
  ["Bids that never arrive", "Small jobs get ignored. By the time a number comes back, the unit has been empty for two weeks."],
  ["Trades out of sequence", "Flooring goes in before the painter shows up. The plumber needs the vanity that hasn't been delivered."],
  ["Punch lists that never close", "The last 5% of the job takes a month of follow-up texts."],
  ["Surprise costs", "Work added on site without a price, then argued about on the invoice."],
  ["No record of what was done", "No photos, no paint colors, no product list—so the next turn starts from zero."],
];

const homeFaq = [
  { q: "Are you a general contractor or a referral service?", a: "A contractor. PortfolioWorks holds the scope, the schedule and the accountability for completion. We self-perform or subcontract work and use licensed trades where the law requires them. You never manage the trades yourself." },
  { q: "Can I hire you for one trade instead of a full project?", a: "Yes. Every service is available à la carte—painting only, flooring only, a repair list—or as a fully managed scope." },
  { q: "How is pricing set?", a: "Written, line-item estimates from a market price sheet. Fixed price for definable scopes; time-and-materials with a not-to-exceed for diagnostic work; cost-plus with a guaranteed maximum price for complex renovations. Scope changes require a signed change order." },
  { q: "Which areas do you serve?", a: "Greater Boston is our launch market. Southeast Florida and Southern Maine are being prepared; we review requests there for availability and do not schedule work until we are properly licensed and insured in that state." },
  { q: "Do you work with tenants in place?", a: "Yes. Access windows and tenant notices are coordinated through you or your property manager and logged in the job record." },
  { q: "What do I get at the end of a job?", a: "A completion record: before/after photos, work performed, signed change orders, paint colors and product SKUs, and the invoice tied to the approved scope." },
];

export default function Home() {
  const featured = services.filter((s) => ["rental-turnovers", "painting-drywall", "flooring", "bathroom-remodeling", "kitchen-remodeling", "carpentry"].includes(s.slug));
  const rest = services.filter((s) => !featured.includes(s));
  const launch = markets.filter((m) => m.status === "launch");
  return (
    <>
      {/* 1. HERO — full-bleed photography, form above the fold */}
      <section className="relative isolate overflow-hidden bg-navy text-paper">
        <Image src={photos.heroRentReadyLivingRoom.src} alt={photos.heroRentReadyLivingRoom.alt} fill priority fetchPriority="high" sizes="100vw" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 scrim-hero" aria-hidden />
        <div className="absolute inset-0 -z-10 grid-bg grid-fade" aria-hidden />
        <div className="wrap py-14 sm:py-20 lg:py-24 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-start">
          <div className="pt-2 lg:pt-10">
            <p className="eyebrow eyebrow-rule !text-bronze-2 mb-6">{site.heroEyebrow}</p>
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.65rem] leading-[1.05] text-paper">{site.heroHeadline}</h1>
            <p className="mt-5 text-xl sm:text-2xl text-paper/90 display leading-snug max-w-xl">{site.heroSecondary}</p>
            <p className="mt-5 text-lg sm:text-xl text-paper/85 leading-relaxed max-w-xl">{site.heroSub}</p>
            <nav aria-label="Choose a pathway" className="mt-9 grid gap-px max-w-md border border-white/25 bg-white/25">
              {site.pathways.map((c, i) => (
                <Link key={c.href} href={c.href} className={`group flex items-center justify-between gap-4 px-5 py-4 transition ${i === 0 ? "bg-bronze hover:bg-bronze-2" : "bg-navy/70 backdrop-blur hover:bg-navy"}`}>
                  <span className="flex items-baseline gap-4">
                    <span className={`num text-xs ${i === 0 ? "text-paper/80" : "text-bronze-2"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-semibold text-paper">{c.label}</span>
                  </span>
                  <span aria-hidden className="text-paper transition group-hover:translate-x-1">→</span>
                </Link>
              ))}
            </nav>
            <dl className="mt-10 sm:mt-14 grid grid-cols-3 gap-3 sm:gap-6 max-w-lg border-t border-white/20 pt-6">
              <div><dt className="text-[0.6rem] sm:text-[0.7rem] uppercase tracking-[0.06em] sm:tracking-[0.14em] text-paper/60">Accountability</dt><dd className="display text-lg sm:text-2xl mt-1.5 leading-tight">1 partner</dd></div>
              <div><dt className="text-[0.6rem] sm:text-[0.7rem] uppercase tracking-[0.06em] sm:tracking-[0.14em] text-paper/60">Pricing</dt><dd className="display text-lg sm:text-2xl mt-1.5 leading-tight">Line&#8209;item</dd></div>
              <div><dt className="text-[0.6rem] sm:text-[0.7rem] uppercase tracking-[0.06em] sm:tracking-[0.14em] text-paper/60">Closeout</dt><dd className="display text-lg sm:text-2xl mt-1.5 leading-tight">Photo record</dd></div>
            </dl>
          </div>
          <LeadForm funnel="walkthrough" />
        </div>
      </section>

      {/* 2. CREDIBILITY STRIP */}
      <section className="bg-white border-b border-line">
        <div className="wrap py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          {[
            ["Owner-operator perspective", "Built by a Greater Boston rental owner and developer who has run turnovers from the owner's side."],
            founder.credentialsVerified
              ? ["Construction management training", "Cornell MBA and WPI Master's in Construction Project Management behind every scope and schedule."]
              : ["Scoped like a project manager", "Quantities, allowances, exclusions and a schedule on every estimate, not a number on a napkin."],
            ["Licensed trades where required", "Plumbing, electrical, HVAC and gas work performed only by properly licensed contractors."],
            ["Written everything", "Scopes, estimates, change orders and completion records, all in writing."],
          ].map(([t, d]) => (
            <div key={t} className="border-l-2 border-bronze pl-5">
              <p className="font-semibold text-navy">{t}</p>
              <p className="text-slate mt-1.5 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PAIN POINTS — split with photography */}
      <Section tone="paper">
        <div className="grid lg:grid-cols-[1fr_1.25fr] gap-14 items-start">
          <div className="lg:sticky lg:top-32">
            <Heading eyebrow="The real cost of a turnover" title="The work isn't the hard part. Coordinating it is." sub="Landlords rarely lose time to the painting itself. They lose it to the gaps between trades, the bids that don't come back and the follow-ups no one owns." />
            <Photo k="painterWall" className="aspect-[4/5] hidden lg:block" sizes="40vw" />
          </div>
          <div>
            <div className="grid sm:grid-cols-2 hairline-grid border border-line">
              {pains.map(([t, d], i) => (
                <div key={t} className="bg-paper p-7 sm:p-8">
                  <p className="num text-bronze text-sm">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-[1.35rem] text-navy mt-3">{t}</h3>
                  <p className="text-slate mt-2 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-2xl text-navy display leading-snug border-l-2 border-bronze pl-6">PortfolioWorks replaces that process with one scope, one schedule and one coordinator who owns it to completion.</p>
          </div>
        </div>
      </Section>

      {/* 4. FULL-SERVICE VS A LA CARTE */}
      <Section tone="white">
        <Heading eyebrow="Choose how you buy" title="One trade or the whole project. Same standard either way." />
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { k: "rentReadyOpenPlan" as PhotoKey, eyebrow: "Fully managed", t: "Turnkey project delivery", d: "We walk the unit, build the scope, price it, sequence every trade, manage the punch list and hand back a documented, rent-ready unit.", items: ["Single point of contact", "All trades sequenced in one schedule", "Fixed-price scope with change-order control", "Completion record and photo set"], href: "/request-a-turnover", cta: "Request a managed turnover", dark: true },
            { k: "flooringCutting" as PhotoKey, eyebrow: "À la carte", t: "Individual trades and repairs", d: "Need a repaint, new flooring in two bedrooms or a repair list closed out? Book a single trade with the same written estimate and documentation.", items: ["Painting & drywall", "Flooring", "Carpentry & repair lists", "Coordinated licensed plumbing, electrical, HVAC"], href: "/lp/trade-work", cta: "Start a trade request", dark: false },
          ].map((c) => (
            <div key={c.t} className={`flex flex-col border ${c.dark ? "border-navy" : "border-line"} bg-white`}>
              <Photo k={c.k} className="aspect-[16/9]" sizes="(min-width: 768px) 50vw, 100vw" />
              <div className="p-8 sm:p-10 flex flex-col flex-1">
                <p className="eyebrow">{c.eyebrow}</p>
                <h3 className="text-[1.75rem] text-navy mt-2">{c.t}</h3>
                <p className="text-slate mt-3 leading-relaxed">{c.d}</p>
                <ul className="mt-6 space-y-2.5 text-sm">{c.items.map((x) => <Check key={x}>{x}</Check>)}</ul>
                <div className="mt-auto pt-8"><Btn href={c.href} variant={c.dark ? "dark" : "ghost"}>{c.cta}</Btn></div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. AUDIENCES — five buyer types, three pathways (specs/03 §1) */}
      <Section tone="paper2">
        <Heading eyebrow="Who we work with" title="Built for the way you own and operate." sub="Landlord, PM and association work runs in a business pipeline; owner-occupied renovations run separately, so each gets the right process and paperwork." />
        <div className="grid md:grid-cols-6 gap-6">
          {[
            { k: "bostonBrickApartments" as PhotoKey, t: "Independent landlords", s: "1–10 units", d: "Fast turns, line-item estimates and one contractor for every unit.", href: "/landlords", cta: "Plan a unit turnover", span: "md:col-span-3" },
            { k: "scopePlanning" as PhotoKey, t: "Multifamily investors", s: "Value-add, rehab, capex", d: "Executable rehab scopes and unit renovation programs, priced line by line.", href: "/real-estate-investors", cta: "Request renovation estimate", span: "md:col-span-3" },
            { k: "inspectionChecklist" as PhotoKey, t: "Property managers", s: "10–1,000+ doors", d: "Approved-vendor onboarding, rate cards and owner-separated invoicing.", href: "/property-managers", cta: "Discuss a portfolio program", span: "md:col-span-2" },
            { k: "bostonNorthEnd" as PhotoKey, t: "HOA & condo boards", s: "Common areas, unit work", d: "Association-ready COIs, board-friendly proposals and access compliance.", href: "/hoa-condos", cta: "For associations", span: "md:col-span-2" },
            { k: "kitchenRenovated" as PhotoKey, t: "Residential owner renovations", s: "Kitchens, baths, whole-home", d: "Your own home, run like a managed project with a written scope.", href: "/home-renovations", cta: "Request renovation estimate", span: "md:col-span-2" },
          ].map((p) => (
            <Link key={p.t} href={p.href} className={`group relative isolate flex ${p.span.includes("3") ? "min-h-[24rem]" : "min-h-[22rem]"} flex-col justify-end overflow-hidden bg-navy text-paper lift zoom ${p.span}`}>
              <Image src={photos[p.k].src} alt={photos[p.k].alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="-z-20 object-cover" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/95 via-ink/70 via-45% to-ink/10" aria-hidden />
              <span className="tag-illustrative !top-3 !bottom-auto">Illustrative</span>
              <div className="p-7">
                <p className="text-xs uppercase tracking-[0.14em] text-bronze-2 font-semibold">{p.s}</p>
                <h3 className="text-[1.6rem] leading-tight mt-2">{p.t}</h3>
                <p className="text-paper/85 mt-2 text-sm leading-relaxed max-w-md">{p.d}</p>
                <p className="mt-5 text-sm font-semibold text-paper group-hover:text-bronze-2">{p.cta} →</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* 6. SERVICE CATALOG — photo cards + compact list */}
      <Section tone="white">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="eyebrow eyebrow-rule mb-4">Service catalog</p>
            <h2 className="text-[2rem] sm:text-[2.75rem] leading-[1.08] text-navy">Everything a rental property needs between tenants, and beyond.</h2>
          </div>
          <Btn href="/services" variant="ghost">All services</Btn>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((s) => (
            <Link key={s.slug} href={s.href} className="group block bg-white lift">
              <Photo k={SERVICE_PHOTO[s.slug]} className="aspect-[4/3] zoom" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
              <div className="pt-5 pb-2">
                <h3 className="text-xl text-navy group-hover:text-bronze transition">{s.name}</h3>
                <p className="text-sm text-slate mt-1.5 leading-relaxed">{s.short}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 hairline-grid border border-line">
          {rest.map((s) => (
            <Link key={s.slug} href={s.href} className="bg-white p-6 hover:bg-paper transition">
              <h3 className="text-lg text-navy">{s.name}</h3>
              <p className="text-sm text-slate mt-1.5">{s.short}</p>
            </Link>
          ))}
          <Link href="/general-contracting" className="bg-navy text-paper p-6 hover:bg-navy-2 transition">
            <h3 className="text-lg">General contracting</h3>
            <p className="text-sm text-paper/70 mt-1.5">Larger projects under one accountable contract.</p>
          </Link>
        </div>
      </Section>

      {/* 7. TURNOVER PROCESS — photo band */}
      <section className="relative isolate overflow-hidden bg-navy text-paper">
        <Image src={photos.siteWalkthrough.src} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/75 via-navy/85 to-navy/95" aria-hidden />
        <Container className="py-20 sm:py-28">
          <Heading light eyebrow="How a turnover runs" title="Move-out to move-in, in five controlled steps." />
          <ol className="grid md:grid-cols-5 gap-8">
            {[
              ["Intake", "Unit details and photos submitted through the form."],
              ["Walkthrough", "Condition documented room by room; damage separated from normal wear."],
              ["Scope & price", "Line-item estimate with schedule. You approve, defer or remove items."],
              ["Execution", "One coordinator sequences repairs → paint → floors → fixtures → clean."],
              ["Closeout", "Punch walk, after photos, completion record, invoice matched to scope."],
            ].map(([t, d], i) => (
              <li key={t} className="border-t border-bronze-2/70 pt-5">
                <p className="num text-bronze-2 text-3xl">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-xl mt-3">{t}</h3>
                <p className="text-paper/70 text-sm mt-2 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12"><Btn href="/how-it-works" variant="light">See the full process</Btn></div>
        </Container>
      </section>

      {/* 8. SAMPLE SCOPES */}
      <Section tone="paper">
        <Heading eyebrow="Sample scopes" title="What different turns typically include." sub="Illustrative scope tiers to show how we package work. Your price depends on your unit, condition and market. Use the scope planner or request a walkthrough." />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { k: "wallRepair" as PhotoKey, t: "Light turn", d: "Good condition, normal wear", items: ["Patch & touch-up paint", "Caulk and grout refresh", "Hardware and fixture fixes", "Make-ready clean"] },
            { k: "flooringCutting" as PhotoKey, t: "Standard turn", d: "Typical 2–4 year tenancy", items: ["Full repaint, walls & trim", "LVP in high-wear rooms", "Bath and kitchen refresh", "Repair list & clean"] },
            { k: "kitchenBoston" as PhotoKey, t: "Heavy turn / renovation", d: "Long tenancy or damage", items: ["Full repaint incl. ceilings", "Flooring most of unit", "Kitchen or bath upgrade", "Carpentry and licensed trade work"] },
          ].map((s) => (
            <div key={s.t} className="card overflow-hidden">
              <Photo k={s.k} className="aspect-[3/2]" sizes="(min-width: 768px) 33vw, 100vw" />
              <div className="p-7">
                <h3 className="text-2xl text-navy">{s.t}</h3>
                <p className="text-sm text-slate mt-1">{s.d}</p>
                <ul className="mt-5 space-y-2 text-sm">{s.items.map((x) => <Check key={x}>{x}</Check>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. PORTFOLIO PROGRAM */}
      <Section tone="white">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <Heading eyebrow="Portfolio Partner program" title="One vendor relationship for your portfolio's renovation needs." sub="For owners and managers with recurring work across many units." />
            <ul className="space-y-3">{["Pilot one unit before any commitment", "Agreed rate card and standard unit packages", "Approval thresholds by user and owner", "Owner-separated invoicing", "Quarterly spend and cycle-time reviews"].map((x) => <Check key={x}>{x}</Check>)}</ul>
            <div className="mt-9 flex gap-3 flex-wrap"><Btn href={site.pathways[2].href} variant="dark">{site.pathways[2].label}</Btn></div>
          </div>
          <div className="relative">
            <Photo k="bostonBrickStreet" className="aspect-[4/5] sm:aspect-[5/6]" sizes="(min-width: 1024px) 45vw, 100vw" />
            <div className="relative -mt-24 ml-6 mr-6 sm:ml-12 sm:-mr-4 bg-paper p-7 border border-line shadow-2xl">
              <p className="eyebrow mb-4">Partnership path</p>
              {["Discovery call", "Vendor prequalification (COI, W-9)", "Pilot property / unit", "Approved vendor", "Recurring work & expansion"].map((s, i) => (
                <div key={s} className="flex items-center gap-4 py-2.5 border-b border-line last:border-0">
                  <span className="num h-8 w-8 grid place-items-center bg-navy text-paper text-sm">{i + 1}</span>
                  <span className="text-navy">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 10. ESTIMATOR */}
      <Section tone="paper2" id="estimator">
        <Heading eyebrow="Unit Turn Scope Planner" title="Plan the turn in under a minute." sub="Pick the rooms and trades to see what the turn involves, timing and access notes. No prices online: submit the unit for a written scope and proposal." />
        <TurnoverEstimator embedded />
      </Section>

      {/* 11. CLOSEOUT RECORD (replaces the empty before/after gallery and the demo-data portal preview) */}
      <Section tone="ink">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-14 items-center">
          <div>
            <Heading light eyebrow="Every job, documented" title="You get a completion record, not a pile of texts." sub="Each project closes with a record you keep for the property file and the next turn." />
            <ul className="space-y-3 text-paper/85">{["Before, progress and after photos, room by room", "Work performed against the approved line items", "Signed change orders, if any", "Paint colors, product SKUs and finishes", "Invoice tied to the approved scope"].map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Photo k="inspectionChecklist" className="aspect-[4/5] col-span-1" sizes="(min-width: 1024px) 25vw, 50vw" />
            <div className="grid gap-4">
              <Photo k="bathroomVanity" className="aspect-[4/3]" sizes="(min-width: 1024px) 25vw, 50vw" />
              <Photo k="flooringInstall" className="aspect-[4/3]" sizes="(min-width: 1024px) 25vw, 50vw" />
            </div>
          </div>
        </div>
        <IllustrativeNote light className="mt-8" />
      </Section>

      {/* 12. WHY ONE CONTRACTOR */}
      <Section tone="paper">
        <Heading eyebrow="Why one accountable contractor" title="When five vendors share a job, nobody owns the outcome." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-line bg-white min-w-[40rem]">
            <thead><tr className="bg-paper-2 text-left"><th scope="col" className="p-5"><span className="sr-only">Topic</span></th><th scope="col" className="p-5 font-semibold text-slate">Managing trades yourself</th><th scope="col" className="p-5 font-semibold text-navy border-l-2 border-bronze">PortfolioWorks</th></tr></thead>
            <tbody>
              {[
                ["Estimates", "Separate bids, different formats, gaps between them", "One line-item scope covering every trade"],
                ["Scheduling", "You sequence the trades and chase confirmations", "Coordinator sequences and confirms"],
                ["Changes", "Verbal adds, surprise invoices", "Written change orders, approved before work"],
                ["Punch list", "Your follow-up", "Our responsibility to close"],
                ["Records", "Texts and receipts", "Photos, products, colors and invoices per unit"],
              ].map(([k, a, b]) => (
                <tr key={k} className="border-t border-line"><th scope="row" className="p-5 display text-lg text-navy text-left font-normal">{k}</th><td className="p-5 text-slate">{a}</td><td className="p-5 border-l-2 border-bronze">{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 13. PM EXPERTISE */}
      <Section tone="white">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-14 items-start">
          <Placeholder label="Founder portrait" className="aspect-[4/5]" />
          <div>
            <Heading eyebrow="Project management expertise" title="Run by someone who has owned the problem." />
            {founder.bio.map((p) => <p key={p} className="text-slate leading-relaxed mb-4 text-lg">{p}</p>)}
            {verifiedFounderCredentials().length > 0 && <ul className="mt-4 space-y-2 text-sm">{verifiedFounderCredentials().map((c) => <Check key={c}>{c}</Check>)}</ul>}
            <Btn href="/about" variant="ghost" className="mt-6">About PortfolioWorks</Btn>
          </div>
        </div>
      </Section>

      {/* 14. CASE STUDIES */}
      <Section tone="paper2">
        <Heading eyebrow="Case studies" title="How every case study will be documented." sub="Case studies are published only from completed PortfolioWorks projects, with verified numbers and owner permission. Each one follows the same format:" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 hairline-grid border border-line text-sm">
          {CASE_STUDY_SECTIONS.map(([t, d], i) => (
            <div key={t} className="bg-paper p-6"><p className="num text-bronze text-2xl">{String(i + 1).padStart(2, "0")}</p><p className="mt-3 text-navy text-lg display">{t}</p><p className="mt-1.5 text-slate leading-relaxed">{d}</p></div>
          ))}
          <Link href="/projects" className="bg-navy text-paper p-6 flex flex-col justify-end hover:bg-navy-2 transition"><p className="display text-lg">View projects</p><p className="text-paper/70 mt-1.5">Published as projects close out →</p></Link>
        </div>
      </Section>

      {/* 15. MARKETS */}
      <section className="relative isolate overflow-hidden bg-navy text-paper">
        <Image src={photos.bostonNorthEnd.src} alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 scrim-hero" aria-hidden />
        <Container className="py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-end">
          <div>
            <p className="eyebrow eyebrow-rule !text-bronze-2 mb-4">Where we work</p>
            <h2 className="text-[2rem] sm:text-[2.75rem] leading-[1.08]">{launch.map((m) => m.short).join(" & ")} first. New markets only when we&apos;re licensed and staffed.</h2>
          </div>
          <div className="grid gap-3">
            {markets.map((m) => (
              <Link key={m.id} href={`/markets/${m.id}`} className="flex items-center justify-between gap-4 border border-white/25 bg-white/5 px-5 py-4 backdrop-blur hover:bg-white/10 transition">
                <span className="display text-xl">{m.short}</span>
                <span className="text-xs uppercase tracking-[0.14em] text-paper/70">{m.status === "launch" ? "Now serving" : m.status === "licensing-pending" ? "Opening soon" : "Under evaluation"} →</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* 16. FAQ */}
      <Section tone="white">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-14">
          <Heading eyebrow="FAQ" title="Questions owners and managers ask first." />
          <div>
            <Faq items={homeFaq} />
            <FaqJsonLd items={homeFaq} />
          </div>
        </div>
      </Section>

      {/* 17. LEAD FORM */}
      <Section tone="paper" id="consultation">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-14">
          <div>
            <Heading eyebrow="Start here" title="Get a property project plan." sub="Tell us about the property and what it needs. A coordinator reviews every request and replies with next steps: a photo-based scope, a site walk or a consultation." />
            <ul className="space-y-2.5 text-sm">{["No obligation and no contract until you approve a written scope", "Single units and full portfolios welcome", ...markets.map((m) => `${m.short}${m.status === "launch" ? "" : " — reviewed for availability"}`)].map((x) => <Check key={x}>{x}</Check>)}</ul>
            <Photo k="measuringDetail" className="aspect-[16/10] mt-10 hidden lg:block" sizes="40vw" />
          </div>
          <LeadForm funnel="walkthrough" />
        </div>
      </Section>

      <CtaBand title="Three ways to start. One accountable team." primary={site.pathways[0]} secondary={site.pathways[1]} tertiary={site.pathways[2]} />
    </>
  );
}
