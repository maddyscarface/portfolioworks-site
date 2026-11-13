import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { site, founder } from "@/config/site";
import { services } from "@/config/services";
import { markets, type Market } from "@/config/markets";
import { photos, type PhotoKey } from "@/config/photos";
import { flags } from "@/config/flags";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" fill={light ? "#f7f4ee" : "#142036"} />
        <rect x="6" y="15" width="5" height="9" fill="#9c6b3a" />
        <rect x="12.5" y="10" width="5" height="14" fill={light ? "#142036" : "#f7f4ee"} />
        <rect x="19" y="6" width="5" height="18" fill={light ? "#142036" : "#f7f4ee"} />
      </svg>
      <span className={`leading-none ${light ? "text-paper" : "text-navy"}`}>
        <span className="display text-[1.15rem] font-semibold tracking-tight">PortfolioWorks</span>
        <span className="block text-[0.55rem] tracking-[0.16em] uppercase opacity-70 mt-0.5">Contracting &amp; Property Services</span>
      </span>
    </span>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`wrap ${className}`}>{children}</div>;
}

export function Section({ id, children, tone = "paper", className = "" }: { id?: string; children: ReactNode; tone?: "paper" | "white" | "navy" | "ink" | "paper2"; className?: string }) {
  const tones = { paper: "bg-paper", white: "bg-white", navy: "bg-navy text-paper", ink: "bg-ink text-paper", paper2: "bg-paper-2" };
  return (
    <section id={id} className={`${tones[tone]} py-20 sm:py-28 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Heading({ eyebrow, title, sub, center = false, light = false }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""} mb-12`}>
      {eyebrow && <p className={`eyebrow eyebrow-rule mb-4 ${light ? "!text-bronze-2" : ""}`}>{eyebrow}</p>}
      <h2 className={`text-[2rem] sm:text-[2.75rem] leading-[1.08] ${light ? "text-paper" : "text-navy"}`}>{title}</h2>
      {sub && <p className={`mt-5 text-lg leading-relaxed ${light ? "text-paper/75" : "text-slate"}`}>{sub}</p>}
    </div>
  );
}

/**
 * Photograph with consistent art direction. All library photos are illustrative stock, so an
 * "Illustrative" tag is shown unless `tag={false}` (e.g. purely decorative backgrounds behind text).
 */
export function Photo({ k, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", priority = false, tag = true, rounded = false, fill = true }: { k: PhotoKey; className?: string; sizes?: string; priority?: boolean; tag?: boolean; rounded?: boolean; fill?: boolean }) {
  const p = photos[k];
  return (
    <div className={`relative overflow-hidden bg-paper-2 ${rounded ? "rounded-[2px]" : ""} ${className}`}>
      {fill ? (
        <Image src={p.src} alt={p.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <Image src={p.src} alt={p.alt} width={p.width} height={p.height} sizes={sizes} priority={priority} className="h-auto w-full" />
      )}
      {tag && <span className="tag-illustrative">Illustrative</span>}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children, aside, image = "heroRentReadyLivingRoom" }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode; aside?: ReactNode; image?: PhotoKey | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy text-paper">
      {image && (
        <>
          <Image src={photos[image].src} alt={photos[image].alt} fill priority sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 scrim-hero" aria-hidden />
          <div className="absolute inset-0 -z-10 grid-bg grid-fade" aria-hidden />
        </>
      )}
      {!image && <div className="absolute inset-0 -z-10 grid-bg" aria-hidden />}
      <Container className={`py-16 sm:py-24 ${aside ? "grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center" : "lg:py-32"}`}>
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow eyebrow-rule !text-bronze-2 mb-5">{eyebrow}</p>}
          <h1 className="text-[2.4rem] sm:text-5xl lg:text-[3.6rem] leading-[1.04] text-paper">{title}</h1>
          {sub && <p className="mt-6 text-lg sm:text-xl text-paper/80 leading-relaxed max-w-2xl">{sub}</p>}
          {children && <div className="mt-9 flex flex-wrap gap-3">{children}</div>}
        </div>
        {aside && <div>{aside}</div>}
      </Container>
    </section>
  );
}

export function Btn({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "dark" | "ghost" | "ghost-light" | "light"; className?: string }) {
  const v = { primary: "btn-primary", dark: "btn-dark", ghost: "btn-ghost text-navy", "ghost-light": "btn-ghost text-paper", light: "btn-light" }[variant];
  return (
    <Link href={href} className={`btn ${v} ${className}`}>
      {children} <span aria-hidden className="arrow">→</span>
    </Link>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg text-navy display">
            {f.q}
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center border border-line text-bronze text-lg leading-none group-open:rotate-45 transition">+</span>
          </summary>
          <p className="mt-3 text-slate leading-relaxed max-w-3xl">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return <JsonLd data={{ "@context": "https://schema.org", ...faqSchema(items) }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="wrap pt-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-line">/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-charcoal">{item.name}</span>
            ) : (
              <Link href={item.path} className="hover:text-navy underline decoration-line">{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbSchema(items) }} />
    </nav>
  );
}

export function CtaBand({ title = "Tell us about the property. We'll build the plan.", sub, primary = site.ctas.primary, secondary = site.ctas.commercial, tertiary, image = "rentReadyOpenPlan" }: { title?: string; sub?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string }; tertiary?: { label: string; href: string }; image?: PhotoKey }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      <Image src={photos[image].src} alt="" fill sizes="100vw" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 scrim-hero" aria-hidden />
      <Container className="py-20 sm:py-24 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
        <div>
          <p className="eyebrow eyebrow-rule !text-bronze-2 mb-4">{site.campaignTagline}</p>
          <h2 className="text-3xl sm:text-[2.75rem] leading-[1.1] text-paper">{title}</h2>
          <p className="mt-4 text-paper/75 max-w-xl">{sub ?? "A coordinator reviews every request and replies with next steps: a photo-based scope, a site walk or a consultation. No obligation until you approve a written scope."}</p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
          <Btn href={primary.href} className="md:min-w-[19rem] md:justify-between">{primary.label}</Btn>
          <Btn href={secondary.href} variant="ghost-light" className="md:min-w-[19rem] md:justify-between">{secondary.label}</Btn>
          {tertiary && <Btn href={tertiary.href} variant="ghost-light" className="md:min-w-[19rem] md:justify-between">{tertiary.label}</Btn>}
        </div>
      </Container>
    </section>
  );
}

export function MarketStatusNote({ m }: { m: Market }) {
  if (m.status === "launch") return null;
  const text =
    m.status === "licensing-pending"
      ? `${m.short} is opening soon. Licensing and insurance for this market are being finalized; project requests are reviewed for availability and nothing is scheduled until we are authorized to perform the work.`
      : `${m.short} is under evaluation. We review project inquiries for fit and capacity before confirming any service.`;
  return <div className="border-l-4 border-bronze bg-bronze-soft px-4 py-3 text-sm text-charcoal">{text}</div>;
}

export function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[0.55rem] h-[7px] w-[7px] shrink-0 rotate-45 bg-bronze" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/**
 * Formerly a grey "Photo needed" box. Portraits render a neutral monogram card (never a stock person
 * in place of a real one). Project slots (before/after etc.) render a refined "documented on
 * completion" panel — we never fill a before/after slot with stock photography.
 */
export function Placeholder({ label, className = "" }: { label: string; className?: string }) {
  if (/portrait|founder|headshot/i.test(label)) {
    return (
      <div className={`relative overflow-hidden bg-navy text-paper flex flex-col justify-between p-8 ${className}`} role="img" aria-label="PortfolioWorks founder (portrait to be added)">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
        <svg className="relative" width="44" height="44" viewBox="0 0 30 30" aria-hidden>
          <rect x="6" y="15" width="5" height="9" fill="#b9864f" />
          <rect x="12.5" y="10" width="5" height="14" fill="#f7f4ee" />
          <rect x="19" y="6" width="5" height="18" fill="#f7f4ee" />
        </svg>
        <div className="relative">
          <p className="display text-6xl text-paper/90">{founder.name.split(" ").map((w) => w[0]).join("")}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-paper/60">Founder &amp; Managing Director</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-paper-2 border border-line flex flex-col justify-between p-5 ${className}`} role="img" aria-label={`${label}: project photo added on completion`}>
      <svg className="absolute inset-0 h-full w-full text-line" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <path d="M0 100 L35 58 L55 76 L75 48 L100 70 L100 100 Z" fill="currentColor" opacity=".45" />
      </svg>
      <span className="relative text-[0.68rem] uppercase tracking-[0.16em] text-bronze">{label}</span>
      <span className="relative text-xs text-slate">Documented on completion, with owner permission</span>
    </div>
  );
}

/** Small honest disclosure shown under photo-led sections. */
export function IllustrativeNote({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <p className={`text-xs ${light ? "text-paper/50" : "text-slate"} ${className}`}>
      Photography is illustrative and does not show PortfolioWorks projects. Documented project galleries are published only with owner permission.
    </p>
  );
}

const NAV = [
  { href: "/rental-turnovers", label: "Turnovers" },
  { href: "/rental-renovations", label: "Renovations" },
  { href: "/services", label: "Services" },
  { href: "/portfolio-programs", label: "Portfolio Programs" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/unit-turn-estimator", label: "Estimator" },
  { href: "/service-areas", label: "Markets" },
];

/** Top-level desktop links. Services is a dropdown; How It Works lives in the utility bar and the Services menu. */
const DESKTOP_NAV = NAV.filter((n) => n.href !== "/services" && n.href !== "/how-it-works");

const SERVICE_MENU = [
  { href: "/services", label: "All services" },
  { href: "/rental-turnovers", label: "Rental turnovers" },
  { href: "/rental-renovations", label: "Rental renovations" },
  { href: "/portfolio-programs", label: "Portfolio programs" },
  ...services.filter((s) => s.href.startsWith("/services/")).map((s) => ({ href: s.href, label: s.name })),
  { href: "/how-it-works", label: "How it works" },
];

const navLinkClass =
  "relative inline-flex items-center py-2 hover:text-navy after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-bronze after:transition hover:after:scale-x-100";

function ServicesMenu() {
  return (
    <div className="relative group">
      <Link href="/services" className={navLinkClass + " gap-1"} aria-haspopup="true">
        Services
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="mt-px opacity-70">
          <path d="M2 3.5 L5 7 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </Link>
      <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-2 opacity-0 pointer-events-none transition group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
        <div className="border border-line bg-paper py-2 shadow-xl">
          {SERVICE_MENU.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-11 items-center px-4 text-[0.875rem] text-charcoal hover:bg-bronze-soft hover:text-navy">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const launch = markets.filter((m) => m.status === "launch").map((m) => m.short).join(" · ");
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy text-paper/75 text-[0.78rem]">
        <div className="wrap flex h-9 items-center justify-between gap-4">
          <span className="truncate">Rental turnovers, renovations &amp; portfolio programs · Serving {launch}</span>
          <span className="hidden sm:flex items-center gap-5 whitespace-nowrap">
            {site.phone && <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="hover:text-paper">{site.phone}</a>}
            <Link href="/how-it-works" className="hover:text-paper">How we work</Link>
            <Link href="/contact" className="hover:text-paper">Contact</Link>
            {flags.portalPreview && <Link href="/portal" className="hover:text-paper">Client portal</Link>}
          </span>
        </div>
      </div>
      <div className="bg-paper/95 backdrop-blur border-b border-line">
        <div className="wrap h-[72px] flex items-center justify-between gap-3 xl:gap-4">
          <Link href="/" aria-label="PortfolioWorks home" className="min-w-0 shrink-0"><Logo /></Link>
          <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 text-[0.875rem] 2xl:text-[0.92rem] text-charcoal whitespace-nowrap" aria-label="Primary">
            {DESKTOP_NAV.slice(0, 2).map((n) => <Link key={n.href} href={n.href} className={navLinkClass}>{n.label}</Link>)}
            <ServicesMenu />
            {DESKTOP_NAV.slice(2).map((n) => <Link key={n.href} href={n.href} className={navLinkClass}>{n.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href={site.ctas.primary.href} className="btn btn-primary !py-2.5 !px-3.5 2xl:!px-4 text-sm whitespace-nowrap hidden sm:inline-flex">Get a Project Plan</Link>
            <details className="mobile-menu xl:hidden relative">
              <summary className="list-none cursor-pointer grid h-11 w-11 place-items-center border border-line bg-white" aria-label="Menu">
                <svg className="menu-closed" width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M2 5h16M2 10h16M2 15h16" stroke="#142036" strokeWidth="1.6" /></svg>
                <svg className="menu-open" width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="#142036" strokeWidth="1.6" /></svg>
              </summary>
              <div className="absolute right-0 top-[3.4rem] w-[min(88vw,22rem)] bg-paper border border-line shadow-2xl p-5">
                <nav className="flex flex-col divide-y divide-line" aria-label="Mobile">
                  {NAV.map((n) => <Link key={n.href} href={n.href} className="flex min-h-11 items-center py-3 text-navy">{n.label}</Link>)}
                  <Link href="/about" className="flex min-h-11 items-center py-3 text-navy">About</Link>
                  <Link href="/contact" className="flex min-h-11 items-center py-3 text-navy">Contact</Link>
                </nav>
                <Link href={site.ctas.primary.href} className="btn btn-primary w-full mt-4">Get a Project Plan</Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper/75 text-sm">
      <Container className="py-16 grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-6 max-w-xs leading-relaxed display text-lg text-paper/90">{site.tagline}</p>
          <p className="mt-3 max-w-xs leading-relaxed">Rental turnovers, renovations and portfolio maintenance programs coordinated through one accountable partner.</p>
          <p className="mt-6"><a href={`mailto:${site.email}`} className="text-paper hover:text-bronze-2">{site.email}</a></p>
          {site.phone && <p className="mt-1"><a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="text-paper hover:text-bronze-2">{site.phone}</a></p>}
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-5">Services</p>
          <ul className="space-y-2.5">{services.slice(0, 9).map((s) => <li key={s.slug}><Link href={s.href} className="hover:text-paper">{s.name}</Link></li>)}</ul>
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-5">Who we serve</p>
          <ul className="space-y-2.5">
            <li><Link href="/landlords" className="hover:text-paper">Landlords</Link></li>
            <li><Link href="/portfolio-owners" className="hover:text-paper">Portfolio owners</Link></li>
            <li><Link href="/property-managers" className="hover:text-paper">Property managers</Link></li>
            <li><Link href="/real-estate-investors" className="hover:text-paper">Investors &amp; brokers</Link></li>
            <li><Link href="/hoa-condos" className="hover:text-paper">HOAs &amp; condos</Link></li>
            <li><Link href="/home-renovations" className="hover:text-paper">Home renovations</Link></li>
            <li><Link href="/rental-renovations" className="hover:text-paper">Rental renovations</Link></li>
            <li><Link href="/general-contracting" className="hover:text-paper">General contracting</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-5">Markets</p>
          <ul className="space-y-2.5">{markets.map((m) => <li key={m.id}><Link href={`/markets/${m.id}`} className="hover:text-paper">{m.short}{m.status === "launch" ? "" : m.status === "licensing-pending" ? " · opening soon" : " · under evaluation"}</Link></li>)}</ul>
          <p className="eyebrow !text-bronze-2 mt-8 mb-4">Company</p>
          <ul className="space-y-2.5">
            <li><Link href="/about" className="hover:text-paper">About</Link></li>
            <li><Link href="/how-it-works" className="hover:text-paper">How it works</Link></li>
            <li><Link href="/projects" className="hover:text-paper">Projects</Link></li>
            <li><Link href="/resources" className="hover:text-paper">Resources</Link></li>
            <li><Link href="/contact" className="hover:text-paper">Contact</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-6 grid gap-3 md:grid-cols-[1fr_auto] text-xs text-paper/50">
          <p className="max-w-3xl leading-relaxed">
            Licensed trade work (plumbing, electrical, HVAC, gas) is performed by appropriately licensed contractors. License and registration numbers are listed per market once verified. Site photography is free-licensed stock used for illustration (Pexels) and does not depict PortfolioWorks projects.
          </p>
          <span className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end items-start"><span>© {new Date().getFullYear()} {site.legalName}</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span>
        </Container>
      </div>
    </footer>
  );
}
