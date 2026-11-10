import Link from "next/link";
import { site, founder } from "@/config/site";
import { services } from "@/config/services";
import { markets } from "@/config/markets";
import { Btn, Check, CtaBand, Faq, FaqJsonLd, Heading, Placeholder, Section } from "@/components/ui";
import LeadForm from "@/components/LeadForm";
import { TurnoverEstimator } from "@/components/Tools";

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
  return (
    <>
      {/* 1. HERO */}
      <section className="bg-navy text-paper grid-bg">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-start">
          <div className="pt-4">
            <p className="eyebrow !text-bronze-2 mb-5">Rental turnovers · Renovations · Portfolio programs</p>
            <h1 className="text-[2.6rem] sm:text-6xl leading-[1.02] text-paper">{site.heroHeadline}</h1>
            <p className="mt-6 text-lg sm:text-xl text-paper/80 leading-relaxed max-w-xl">{site.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={site.ctas.primary.href}>{site.ctas.primary.label}</Btn>
              <Btn href={site.ctas.secondary.href} variant="ghost-light">{site.ctas.secondary.label}</Btn>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-lg border-t border-white/15 pt-6">
              <div><dt className="text-xs text-paper/60">Accountability</dt><dd className="display text-2xl mt-1">1 partner</dd></div>
              <div><dt className="text-xs text-paper/60">Pricing</dt><dd className="display text-2xl mt-1">Line-item</dd></div>
              <div><dt className="text-xs text-paper/60">Closeout</dt><dd className="display text-2xl mt-1">Photo record</dd></div>
            </dl>
          </div>
          <LeadForm funnel="walkthrough" />
        </div>
      </section>

      {/* 2. CREDIBILITY */}
      <section className="bg-white border-b border-line">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div><p className="font-semibold text-navy">Owner-operator perspective</p><p className="text-slate mt-1">Built by a Greater Boston rental owner and developer who has run turnovers from the owner&apos;s side.</p></div>
          <div><p className="font-semibold text-navy">Construction management training</p><p className="text-slate mt-1">Cornell MBA and WPI Master&apos;s in Construction Project Management behind every scope and schedule.</p></div>
          <div><p className="font-semibold text-navy">Licensed trades where required</p><p className="text-slate mt-1">Plumbing, electrical, HVAC and gas work performed only by properly licensed contractors.</p></div>
          <div><p className="font-semibold text-navy">Written everything</p><p className="text-slate mt-1">Scopes, estimates, change orders and completion records—in writing, in your portal.</p></div>
        </div>
      </section>

      {/* 3. PAIN POINTS */}
      <Section tone="paper">
        <Heading eyebrow="The real cost of a turnover" title="The work isn't the hard part. Coordinating it is." sub="Landlords rarely lose time to the painting itself. They lose it to the gaps between trades, the bids that don't come back and the follow-ups no one owns." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line">
          {pains.map(([t, d], i) => (
            <div key={t} className="bg-paper p-7">
              <p className="num text-bronze text-sm">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="text-xl text-navy mt-2">{t}</h3>
              <p className="text-slate mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg text-navy display">PortfolioWorks replaces that process with one scope, one schedule and one coordinator who owns it to completion.</p>
      </Section>

      {/* 4. FULL-SERVICE VS A LA CARTE */}
      <Section tone="white">
        <Heading eyebrow="Choose how you buy" title="One trade or the whole project. Same standard either way." />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-navy p-8">
            <p className="eyebrow">Fully managed</p>
            <h3 className="text-2xl text-navy mt-2">Turnkey project delivery</h3>
            <p className="text-slate mt-3">We walk the unit, build the scope, price it, sequence every trade, manage the punch list and hand back a documented, rent-ready unit.</p>
            <ul className="mt-5 space-y-2 text-sm">{["Single point of contact", "All trades sequenced in one schedule", "Fixed-price scope with change-order control", "Completion record and photo set"].map((x) => <Check key={x}>{x}</Check>)}</ul>
            <Btn href="/request-a-turnover" className="mt-7">Request a managed turnover</Btn>
          </div>
          <div className="border border-line p-8">
            <p className="eyebrow">À la carte</p>
            <h3 className="text-2xl text-navy mt-2">Individual trades and repairs</h3>
            <p className="text-slate mt-3">Need a repaint, new flooring in two bedrooms or a repair list closed out? Book a single trade with the same written estimate and documentation.</p>
            <ul className="mt-5 space-y-2 text-sm">{["Painting & drywall", "Flooring", "Carpentry & repair lists", "Coordinated licensed plumbing, electrical, HVAC"].map((x) => <Check key={x}>{x}</Check>)}</ul>
            <Btn href="/lp/trade-work" variant="ghost" className="mt-7">Start a trade request</Btn>
          </div>
        </div>
      </Section>

      {/* 5. THREE PATHWAYS */}
      <Section tone="paper2">
        <Heading eyebrow="Who we work with" title="Three ways in, depending on how you own and operate." />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "Landlords", s: "1–10 units", d: "Fast turns, clear estimates and one contractor for every unit.", href: "/landlords", cta: "For landlords" },
            { t: "Property managers & portfolio owners", s: "10–1,000+ units", d: "Approved-vendor relationship, rate card, portal access and owner-separated invoicing.", href: "/property-managers", cta: "For portfolios" },
            { t: "Investors & HOAs", s: "Rehab, capex, common areas", d: "Executable rehab scopes, unit renovation programs and association-ready paperwork.", href: "/real-estate-investors", cta: "For investors & HOAs" },
          ].map((p) => (
            <Link key={p.t} href={p.href} className="card p-7 hover:border-bronze transition group">
              <p className="text-xs text-slate">{p.s}</p>
              <h3 className="text-2xl text-navy mt-1">{p.t}</h3>
              <p className="text-slate mt-3">{p.d}</p>
              <p className="mt-6 text-bronze font-semibold text-sm group-hover:underline">{p.cta} →</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* 6. SERVICE CATALOG */}
      <Section tone="white">
        <Heading eyebrow="Service catalog" title="Everything a rental property needs between tenants—and beyond." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line">
          {services.map((s) => (
            <Link key={s.slug} href={s.href} className="bg-white p-6 hover:bg-paper transition">
              <h3 className="text-lg text-navy">{s.name}</h3>
              <p className="text-sm text-slate mt-1.5">{s.short}</p>
            </Link>
          ))}
          <Link href="/general-contracting" className="bg-navy text-paper p-6">
            <h3 className="text-lg">General contracting</h3>
            <p className="text-sm text-paper/70 mt-1.5">Larger projects under one accountable contract.</p>
          </Link>
        </div>
      </Section>

      {/* 7. TURNOVER PROCESS */}
      <Section tone="navy">
        <Heading light eyebrow="How a turnover runs" title="Move-out to move-in, in five controlled steps." />
        <ol className="grid md:grid-cols-5 gap-6">
          {[
            ["Intake", "Unit details and photos submitted through the form or portal."],
            ["Walkthrough", "Condition documented room by room; damage separated from normal wear."],
            ["Scope & price", "Line-item estimate with schedule. You approve, defer or remove items."],
            ["Execution", "One coordinator sequences repairs → paint → floors → fixtures → clean."],
            ["Closeout", "Punch walk, after photos, completion record, invoice matched to scope."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-bronze pt-4">
              <p className="num text-bronze-2">{i + 1}</p>
              <h3 className="text-xl mt-1">{t}</h3>
              <p className="text-paper/70 text-sm mt-2 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 8. SAMPLE SCOPES */}
      <Section tone="paper">
        <Heading eyebrow="Sample scopes" title="What different turns typically include." sub="Illustrative scope tiers to show how we package work. Your price depends on your unit, condition and market—use the estimator or request a walkthrough." />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "Light turn", d: "Good condition, normal wear", items: ["Patch & touch-up paint", "Caulk and grout refresh", "Hardware and fixture fixes", "Make-ready clean"] },
            { t: "Standard turn", d: "Typical 2–4 year tenancy", items: ["Full repaint, walls & trim", "LVP in high-wear rooms", "Bath and kitchen refresh", "Repair list & clean"] },
            { t: "Heavy turn / renovation", d: "Long tenancy or damage", items: ["Full repaint incl. ceilings", "Flooring most of unit", "Kitchen or bath upgrade", "Carpentry and licensed trade work"] },
          ].map((s) => (
            <div key={s.t} className="card p-7">
              <h3 className="text-2xl text-navy">{s.t}</h3>
              <p className="text-sm text-slate mt-1">{s.d}</p>
              <ul className="mt-5 space-y-2 text-sm">{s.items.map((x) => <Check key={x}>{x}</Check>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. PORTFOLIO PROGRAM */}
      <Section tone="white">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Heading eyebrow="Portfolio Partner program" title="One vendor relationship for your portfolio's renovation needs." sub="For owners and managers with recurring work across many units." />
            <ul className="space-y-3">{["Pilot one unit before any commitment", "Agreed rate card and standard unit packages", "Approval thresholds by user and owner", "Owner-separated invoicing", "Quarterly spend and cycle-time reviews"].map((x) => <Check key={x}>{x}</Check>)}</ul>
            <div className="mt-8 flex gap-3 flex-wrap"><Btn href={site.ctas.commercial.href} variant="dark">{site.ctas.commercial.label}</Btn></div>
          </div>
          <div className="bg-paper-2 p-8 border border-line">
            <p className="eyebrow mb-4">Partnership path</p>
            {["Discovery call", "Vendor prequalification (COI, W-9)", "Pilot property / unit", "Approved vendor", "Recurring work & expansion"].map((s, i) => (
              <div key={s} className="flex items-center gap-4 py-3 border-b border-line last:border-0">
                <span className="num h-8 w-8 grid place-items-center bg-navy text-paper text-sm">{i + 1}</span>
                <span className="text-navy">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 10. ESTIMATOR */}
      <Section tone="paper2" id="estimator">
        <Heading eyebrow="Unit Turn Estimator" title="See a preliminary range in under a minute." sub="Built from our internal price sheets. It's a planning number, not a quote—submit the unit for a written scope." />
        <TurnoverEstimator embedded />
      </Section>

      {/* 11. GALLERY */}
      <Section tone="white">
        <Heading eyebrow="Before & after" title="Every project is photo-documented." sub="Our gallery is populated only with real PortfolioWorks projects, shown with owner permission." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["Kitchen — before", "Kitchen — after", "Bath — before", "Bath — after"].map((l) => <Placeholder key={l} label={l} className="aspect-[4/3]" />)}
        </div>
        <p className="mt-4 text-xs text-slate">Launch gate: replace placeholders with real project photography.</p>
      </Section>

      {/* 12. PORTAL PREVIEW */}
      <Section tone="ink">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <div>
            <Heading light eyebrow="Owner portal" title="Every property, unit and project in one place." sub="Request scopes, approve proposals and change orders, track progress, see photos and download invoices." />
            <Btn href="/portal">Preview the portal</Btn>
          </div>
          <div className="bg-paper text-ink p-5 rounded-[3px] shadow-2xl text-sm">
            <div className="flex justify-between items-center border-b border-line pb-3"><span className="font-semibold text-navy">Active projects</span><span className="text-xs text-slate">Sample view</span></div>
            {[["PW-1041", "14 Example Ave · Unit 2", "In progress", 60], ["PW-1038", "220 Sample St · Unit 1", "Punch list", 92], ["PW-1046", "9 Demo Terrace · Units 4 & 7", "Proposal", 15]].map(([id, a, s, pct]) => (
              <div key={id as string} className="py-3 border-b border-line last:border-0 grid grid-cols-[4.5rem_1fr_6rem] gap-3 items-center">
                <span className="num text-bronze">{id}</span>
                <div><p>{a}</p><div className="h-1.5 bg-paper-2 mt-1.5"><div className="h-1.5 bg-navy" style={{ width: `${pct}%` }} /></div></div>
                <span className="text-xs text-right">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 13. WHY ONE CONTRACTOR */}
      <Section tone="paper">
        <Heading eyebrow="Why one accountable contractor" title="When five vendors share a job, nobody owns the outcome." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-line bg-white">
            <thead><tr className="bg-paper-2 text-left"><th className="p-4"> </th><th className="p-4">Managing trades yourself</th><th className="p-4 text-navy">PortfolioWorks</th></tr></thead>
            <tbody>
              {[
                ["Estimates", "Separate bids, different formats, gaps between them", "One line-item scope covering every trade"],
                ["Scheduling", "You sequence the trades and chase confirmations", "Coordinator sequences and confirms"],
                ["Changes", "Verbal adds, surprise invoices", "Written change orders, approved before work"],
                ["Punch list", "Your follow-up", "Our responsibility to close"],
                ["Records", "Texts and receipts", "Photos, products, colors and invoices per unit"],
              ].map(([k, a, b]) => (
                <tr key={k} className="border-t border-line"><td className="p-4 font-semibold text-navy">{k}</td><td className="p-4 text-slate">{a}</td><td className="p-4">{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 14. PM EXPERTISE */}
      <Section tone="white">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <Placeholder label="Founder portrait" className="aspect-[4/5]" />
          <div>
            <Heading eyebrow="Project management expertise" title="Run by someone who has owned the problem." />
            {founder.bio.map((p) => <p key={p} className="text-slate leading-relaxed mb-4">{p}</p>)}
            <ul className="mt-4 space-y-2 text-sm">{founder.credentials.filter((c) => !c.includes("VERIFY")).map((c) => <Check key={c}>{c}</Check>)}</ul>
            <Btn href="/about" variant="ghost" className="mt-6">About PortfolioWorks</Btn>
          </div>
        </div>
      </Section>

      {/* 15. CASE STUDIES */}
      <Section tone="paper2">
        <Heading eyebrow="Case studies" title="Real projects, documented." sub="We publish case studies only from completed PortfolioWorks projects with verified numbers and owner permission. Each one follows the same format:" />
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          {["Property & starting condition", "Scope and budget approved", "Schedule: planned vs. actual", "Outcome with before/after photos"].map((x, i) => (
            <div key={x} className="card p-5"><p className="num text-bronze">{i + 1}</p><p className="mt-2 text-navy">{x}</p></div>
          ))}
        </div>
        <Link href="/projects" className="inline-block mt-6 text-sm underline">View projects</Link>
      </Section>

      {/* 16. FAQ */}
      <Section tone="white">
        <Heading eyebrow="FAQ" title="Questions owners and managers ask first." />
        <Faq items={homeFaq} />
        <FaqJsonLd items={homeFaq} />
      </Section>

      {/* 17. LEAD FORM */}
      <Section tone="paper" id="consultation">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          <div>
            <Heading eyebrow="Start here" title="Get a property project plan." sub="Tell us about the property and what it needs. A coordinator reviews every request and replies with next steps—a photo-based scope, a site walk or a consultation." />
            <ul className="space-y-2 text-sm">{["No obligation and no contract until you approve a written scope", "Single units and full portfolios welcome", ...markets.map((m) => `${m.short}${m.status === "launch" ? "" : " — reviewed for availability"}`)].map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
          <LeadForm funnel="walkthrough" />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
