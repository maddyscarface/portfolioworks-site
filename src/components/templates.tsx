import Link from "next/link";
import type { Metadata } from "next";
import { getService, services, type Service } from "@/config/services";
import { getAudience, type AudienceId } from "@/config/audiences";
import { markets, type Market, type Town } from "@/config/markets";
import { credentialsByMarket } from "@/config/site";
import Image from "next/image";
import { Btn, Check, CtaBand, Faq, FaqJsonLd, Heading, MarketStatusNote, PageHero, Photo, Section } from "@/components/ui";
import { photos, marketPhoto, serviceDetailPhoto, serviceHeroPhoto, type PhotoKey } from "@/config/photos";
import LeadForm from "@/components/LeadForm";
import type { Funnel } from "@/lib/leads";

const funnelForService = (s: Service): Funnel =>
  s.category === "turnover" ? "turnover" : s.category === "program" ? "portfolio" : s.category === "renovation" ? "rehab" : "trade";

export function serviceMetadata(slug: string): Metadata {
  const s = getService(slug)!;
  return { title: s.seoTitle, description: s.seoDescription, alternates: { canonical: s.href } };
}

export function ServiceTemplate({ slug }: { slug: string }) {
  const s = getService(slug)!;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.overview,
    provider: { "@type": "GeneralContractor", name: "PortfolioWorks Contracting & Property Services" },
    areaServed: "Greater Boston, MA",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero image={serviceHeroPhoto(s.slug)} eyebrow={s.category === "program" ? "Portfolio program" : "Service"} title={s.name} sub={s.overview} aside={<LeadForm funnel={funnelForService(s)} defaultServices={[s.slug]} />}>
        <Btn href="#scope" variant="ghost-light">See the typical scope</Btn>
      </PageHero>

      <Section tone="white">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <p className="eyebrow eyebrow-rule mb-4">The problem</p>
            <p className="display text-2xl sm:text-3xl text-navy leading-snug">{s.problem}</p>
            <Photo k={serviceDetailPhoto(s.slug)} className="aspect-[16/10] mt-10" sizes="(min-width: 1024px) 45vw, 100vw" />
          </div>
          <div id="scope">
            <p className="eyebrow mb-3">Typical scope</p>
            <ul className="space-y-2.5">{s.typicalScope.map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12">
          <div>
            <Heading eyebrow="What you receive" title="Deliverables" />
            <ul className="space-y-3">{s.deliverables.map((x) => <Check key={x}>{x}</Check>)}</ul>
            <div className="mt-10 card p-6">
              <p className="eyebrow">Pricing framework</p>
              <p className="text-xl text-navy display mt-2">{s.pricing.model}</p>
              <p className="text-slate mt-2 text-sm leading-relaxed">{s.pricing.framework}</p>
              {s.pricing.illustrativeRange && <p className="text-xs text-slate mt-3">{s.pricing.illustrativeRange}</p>}
              <Link href="/unit-turn-estimator" className="text-sm underline mt-4 inline-block">Try the estimator</Link>
            </div>
          </div>
          <div>
            <Heading eyebrow="Project process" title="How the work runs" />
            <ol className="space-y-0 border-l border-line">
              {s.process.map((p, i) => (
                <li key={p.step} className="relative pl-8 pb-7">
                  <span className="absolute -left-[13px] top-0 h-6 w-6 grid place-items-center bg-navy text-paper text-xs num">{i + 1}</span>
                  <p className="font-semibold text-navy">{p.step}</p>
                  <p className="text-slate text-sm mt-1 leading-relaxed">{p.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12">
          <div>
            <Heading eyebrow="FAQ" title={`${s.name}: common questions`} />
            <Faq items={s.faq} />
            <FaqJsonLd items={s.faq} />
          </div>
          <div>
            <p className="eyebrow mb-4">Often paired with</p>
            <div className="space-y-3">
              {s.upsells.map((u) => {
                const x = getService(u)!;
                return (
                  <Link key={u} href={x.href} className="card p-4 block hover:border-bronze">
                    <p className="text-navy font-semibold">{x.name}</p>
                    <p className="text-sm text-slate">{x.short}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Section>
      <CtaBand
        title={s.cta}
        primary={{
          label: s.cta,
          href: { turnover: "/request-a-turnover", portfolio: "/portfolio-programs#consultation", rehab: "/request-a-renovation-estimate", trade: "/lp/trade-work" }[funnelForService(s) as "turnover" | "portfolio" | "rehab" | "trade"],
        }}
      />
    </>
  );
}

const AUDIENCE_PHOTO: Record<string, PhotoKey> = {
  landlord: "bostonBrickApartments", "portfolio-owner": "bostonNorthEnd", "property-manager": "inspectionChecklist", investor: "scopePlanning", broker: "rentReadyOpenPlan", hoa: "bostonBrickStreet", homeowner: "kitchenRenovated",
};

export function AudienceTemplate({ id, extra }: { id: AudienceId; extra?: React.ReactNode }) {
  const a = getAudience(id);
  const funnel: Funnel = a.formVariant === "portfolio" ? "portfolio" : a.formVariant === "rehab" ? "rehab" : a.formVariant === "trade" ? "trade" : "turnover";
  return (
    <>
      <PageHero image={AUDIENCE_PHOTO[a.id] ?? "heroRentReadyLivingRoom"} eyebrow={`${a.label} · ${a.who}`} title={a.headline} sub={a.sub} aside={<LeadForm funnel={funnel} defaultType={a.id === "broker" ? "broker" : a.id} />}>
        <Btn href={a.cta.href}>{a.cta.label}</Btn>
      </PageHero>
      <Section tone="white">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-12">
          <div>
            <p className="eyebrow mb-3">What you need from a contractor</p>
            <ul className="space-y-2.5">{a.needs.map((n) => <Check key={n}>{n}</Check>)}</ul>
          </div>
          <div className="grid sm:grid-cols-3 gap-px bg-line border border-line">
            {a.howWeHelp.map((h) => (
              <div key={h.title} className="bg-white p-6">
                <h3 className="text-lg text-navy">{h.title}</h3>
                <p className="text-sm text-slate mt-2 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
      {extra}
      <Section tone="paper">
        <Heading eyebrow="Services" title="Request one trade or a full scope." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.filter((s) => a.id !== "homeowner" || HOMEOWNER_SERVICES.includes(s.slug)).map((s) => (
            <Link key={s.slug} href={s.href} className="card p-4 hover:border-bronze text-sm">
              <span className="text-navy font-semibold">{s.name}</span>
            </Link>
          ))}
        </div>
      </Section>
      <Section tone="white">
        <Heading eyebrow="FAQ" title="Questions we hear" />
        <Faq items={a.faq} />
        <FaqJsonLd items={a.faq} />
      </Section>
      <CtaBand primary={a.cta} secondary={a.id === "homeowner" ? { label: "Request a Property Walkthrough", href: "/request-a-property-walkthrough" } : undefined} />
    </>
  );
}

/** Owner-occupied renovations: no rental turnover / portfolio maintenance offers. */
const HOMEOWNER_SERVICES = ["painting-drywall", "flooring", "bathroom-remodeling", "kitchen-remodeling", "carpentry", "exterior-repairs", "plumbing-electrical-hvac-coordination", "full-rehab"];

export function MarketTemplate({ m }: { m: Market }) {
  const cred = credentialsByMarket[m.id];
  const verified = Object.entries(cred).filter(([, v]) => v);
  return (
    <>
      <PageHero image={marketPhoto(m.id)} eyebrow={`Market · ${m.state}`} title={m.headline} sub={m.intro} aside={<LeadForm funnel="walkthrough" />} />
      <Section tone="white">
        <div className="max-w-3xl mb-8"><MarketStatusNote m={m} /></div>
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <Heading eyebrow="Local conditions" title={`Rental work in ${m.short}`} sub={m.housingContext} />
            <p className="eyebrow mb-3">Licensing & compliance notes</p>
            <ul className="space-y-2.5 text-sm text-slate">{m.licensingNotes.map((x) => <Check key={x}>{x}</Check>)}</ul>
            <div className="mt-8 card p-5 text-sm">
              <p className="font-semibold text-navy">Credentials in {m.state}</p>
              {verified.length ? (
                <ul className="mt-2 space-y-1">{verified.map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
              ) : (
                <p className="text-slate mt-1">License, registration and insurance details for {m.state} will be published here once verified.</p>
              )}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Communities served</p>
            <div className="grid grid-cols-2 gap-2">
              {m.towns.filter((t) => t.served).map((t) => (
                <Link key={t.slug} href={`/markets/${m.id}/${t.slug}`} className="card px-4 py-3 text-sm hover:border-bronze">{t.name}</Link>
              ))}
            </div>
            {m.towns.some((t) => !t.served) && (
              <p className="text-xs text-slate mt-4">Additional nearby communities are added only after crew coverage is confirmed. Outside the list? Submit a request and we&apos;ll tell you honestly whether we can serve it.</p>
            )}
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}

export function TownTemplate({ m, t }: { m: Market; t: Town }) {
  return (
    <>
      <PageHero
        image={m.id === "massachusetts" ? "bostonBrickStreet" : marketPhoto(m.id)}
        eyebrow={`${m.short} · ${t.name}`}
        title={`Rental turnovers and renovations in ${t.name}, ${m.state}`}
        sub={`PortfolioWorks coordinates turnovers, repairs and renovations for landlords, property managers and investors with property in ${t.name}. One scope, one schedule, one accountable partner.`}
        aside={<LeadForm funnel="turnover" />}
      />
      <Section tone="white">
        <div className="max-w-3xl mb-8"><MarketStatusNote m={m} /></div>
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl text-navy mb-4">What we do in {t.name}</h2>
            <ul className="space-y-2.5">{services.slice(0, 8).map((s) => <Check key={s.slug}><Link href={s.href} className="underline decoration-line">{s.name}</Link> — {s.short}</Check>)}</ul>
          </div>
          <div>
            <h2 className="text-2xl text-navy mb-4">Local considerations</h2>
            <p className="text-slate leading-relaxed">{m.housingContext}</p>
            <p className="text-slate leading-relaxed mt-4">Permits for {t.name} projects are pulled through the local building department by the party required to pull them, and licensed trade work is completed by appropriately licensed contractors.</p>
            <p className="text-xs text-slate mt-6">Local project case studies for {t.name} will be added as projects complete.</p>
            <Link href={`/markets/${m.id}`} className="inline-block mt-4 text-sm underline">All {m.short} communities</Link>
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}

export interface FunnelConfig {
  funnel: Funnel;
  eyebrow: string;
  offer: string;
  sub: string;
  bullets: string[];
  proof: { t: string; d: string }[];
  defaultServices?: string[];
  defaultType?: "landlord" | "portfolio-owner" | "property-manager" | "investor" | "hoa";
  image?: PhotoKey;
}

const FUNNEL_PHOTO: Partial<Record<Funnel, PhotoKey>> = {
  turnover: "livingRoomGreen", urgent: "painterWall", rehab: "kitchenRenovated", trade: "flooringCutting", portfolio: "bostonNorthEnd", walkthrough: "siteWalkthrough",
};

/** Dedicated conversion page: no top-nav distractions beyond the header, single offer, form above the fold. */
export function FunnelTemplate({ c }: { c: FunnelConfig }) {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy text-paper">
        <Image src={photos[c.image ?? FUNNEL_PHOTO[c.funnel] ?? "heroRentReadyLivingRoom"].src} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 scrim-hero" aria-hidden />
        <div className="wrap py-14 sm:py-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
          <div>
            <p className="eyebrow eyebrow-rule !text-bronze-2 mb-5">{c.eyebrow}</p>
            <h1 className="text-4xl sm:text-[3.2rem] leading-[1.05]">{c.offer}</h1>
            <p className="mt-5 text-lg text-paper/80 leading-relaxed">{c.sub}</p>
            <ul className="mt-8 space-y-3">{c.bullets.map((b) => <Check key={b}>{b}</Check>)}</ul>
            <p className="mt-8 text-xs text-paper/50">Serving {markets.filter((m) => m.status === "launch").map((m) => m.short).join(", ")}. Other markets reviewed for availability.</p>
          </div>
          <LeadForm funnel={c.funnel} defaultServices={c.defaultServices} defaultType={c.defaultType} />
        </div>
      </section>
      <Section tone="white">
        <div className="grid md:grid-cols-3 gap-6">
          {c.proof.map((p) => (
            <div key={p.t} className="border-t border-bronze pt-6">
              <h3 className="text-xl text-navy">{p.t}</h3>
              <p className="text-slate text-sm mt-2 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section tone="paper">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <Photo k={c.funnel === "portfolio" ? "scopePlanning" : c.funnel === "rehab" ? "siteWalkthrough" : "inspectionChecklist"} className="aspect-[4/3]" sizes="(min-width: 1024px) 50vw, 100vw" />
          <div>
            <Heading eyebrow="What happens next" title="A real person reviews every request." />
            <ol className="space-y-6">
              {[
                ["Review", "A coordinator reads your request and replies by email or phone with next steps."],
                [c.funnel === "portfolio" ? "Discovery call" : "Photos or site walk", c.funnel === "portfolio" ? "A short call about your portfolio, current vendors and where turns stall." : "We ask for photos or book a walkthrough to document conditions."],
                [c.funnel === "portfolio" ? "Pilot proposal" : "Written scope", c.funnel === "portfolio" ? "A pilot unit or property with an agreed rate card, before any long-term commitment." : "A line-item scope with schedule. Nothing proceeds without your written approval."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-5">
                  <span className="num grid h-10 w-10 shrink-0 place-items-center bg-navy text-paper">{i + 1}</span>
                  <div><p className="display text-xl text-navy">{t}</p><p className="text-slate mt-1 leading-relaxed">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>
    </>
  );
}
