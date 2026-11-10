import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { services } from "@/config/services";
import { markets, type Market } from "@/config/markets";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" fill={light ? "#f7f4ee" : "#142036"} />
        <rect x="6" y="15" width="5" height="9" fill="#9c6b3a" />
        <rect x="12.5" y="10" width="5" height="14" fill={light ? "#142036" : "#f7f4ee"} />
        <rect x="19" y="6" width="5" height="18" fill={light ? "#142036" : "#f7f4ee"} />
      </svg>
      <span className={`leading-none ${light ? "text-paper" : "text-navy"}`}>
        <span className="display text-[1.2rem] font-semibold tracking-tight">PortfolioWorks</span>
        <span className="block text-[0.58rem] tracking-[0.2em] uppercase opacity-70 mt-0.5">Contracting & Property Services</span>
      </span>
    </span>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Section({ id, children, tone = "paper", className = "" }: { id?: string; children: ReactNode; tone?: "paper" | "white" | "navy" | "ink" | "paper2"; className?: string }) {
  const tones = { paper: "bg-paper", white: "bg-white", navy: "bg-navy text-paper", ink: "bg-ink text-paper", paper2: "bg-paper-2" };
  return (
    <section id={id} className={`${tones[tone]} py-16 sm:py-24 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Heading({ eyebrow, title, sub, center = false, light = false }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""} mb-10`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className={`text-3xl sm:text-[2.6rem] leading-[1.1] ${light ? "text-paper" : "text-navy"}`}>{title}</h2>
      {sub && <p className={`mt-4 text-lg leading-relaxed ${light ? "text-paper/75" : "text-slate"}`}>{sub}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children, aside }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="bg-navy text-paper grid-bg">
      <Container className="py-16 sm:py-24 grid lg:grid-cols-[1.25fr_1fr] gap-12 items-center">
        <div>
          {eyebrow && <p className="eyebrow !text-bronze-2 mb-4">{eyebrow}</p>}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.05] text-paper">{title}</h1>
          {sub && <p className="mt-6 text-lg sm:text-xl text-paper/80 leading-relaxed max-w-2xl">{sub}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
        {aside && <div>{aside}</div>}
      </Container>
    </section>
  );
}

export function Btn({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "dark" | "ghost" | "ghost-light"; className?: string }) {
  const v = { primary: "btn-primary", dark: "btn-dark", ghost: "btn-ghost text-navy", "ghost-light": "btn-ghost text-paper" }[variant];
  return (
    <Link href={href} className={`btn ${v} ${className}`}>
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-semibold text-navy">
            {f.q}
            <span className="text-bronze text-xl leading-none group-open:rotate-45 transition">+</span>
          </summary>
          <p className="mt-3 text-slate leading-relaxed max-w-3xl">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function CtaBand({ title = "Tell us about the property. We'll build the plan.", sub, primary = site.ctas.primary, secondary = site.ctas.commercial }: { title?: string; sub?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string } }) {
  return (
    <section className="bg-ink text-paper">
      <Container className="py-16 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <p className="eyebrow !text-bronze-2 mb-3">{site.campaignTagline}</p>
          <h2 className="text-3xl sm:text-4xl text-paper">{title}</h2>
          {sub && <p className="mt-3 text-paper/70">{sub}</p>}
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
          <Btn href={primary.href}>{primary.label}</Btn>
          <Btn href={secondary.href} variant="ghost-light">{secondary.label}</Btn>
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
      <span className="mt-1.5 h-2 w-2 shrink-0 bg-bronze" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export function Placeholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-paper-2 border border-line flex items-end ${className}`} role="img" aria-label={`Photo placeholder: ${label}`}>
      <svg className="absolute inset-0 h-full w-full text-line" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <path d="M0 100 L35 55 L55 75 L75 45 L100 70 L100 100 Z" fill="currentColor" opacity=".6" />
      </svg>
      <span className="relative m-3 text-[0.7rem] uppercase tracking-wider bg-white/85 px-2 py-1 text-slate">Photo needed · {label}</span>
    </div>
  );
}

export function Header() {
  const nav = [
    { href: "/rental-turnovers", label: "Turnovers" },
    { href: "/services", label: "Services" },
    { href: "/portfolio-programs", label: "Portfolio Programs" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/unit-turn-estimator", label: "Estimator" },
    { href: "/service-areas", label: "Markets" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" aria-label="PortfolioWorks home"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-5 text-[0.9rem] text-charcoal whitespace-nowrap">
          {nav.map((n) => <Link key={n.href} href={n.href} className="hover:text-bronze">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/portal" className="hidden xl:inline text-sm text-slate hover:text-navy whitespace-nowrap">Client Portal</Link>
          <Link href={site.ctas.primary.href} className="btn btn-primary !py-2.5 !px-4 text-sm whitespace-nowrap">Get a Project Plan</Link>
        </div>
      </div>
      <nav className="lg:hidden border-t border-line overflow-x-auto">
        <div className="flex gap-5 px-5 py-2.5 text-sm whitespace-nowrap">
          {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper/80 text-sm">
      <Container className="py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs leading-relaxed">{site.tagline} Rental turnovers, renovations and portfolio maintenance programs coordinated through one accountable partner.</p>
          <p className="mt-4 text-paper/50 text-xs leading-relaxed">
            Licensed trade work (plumbing, electrical, HVAC, gas) is performed by appropriately licensed contractors. License and registration numbers are listed per market once verified.
          </p>
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-4">Services</p>
          <ul className="space-y-2">{services.slice(0, 9).map((s) => <li key={s.slug}><Link href={s.href} className="hover:text-paper">{s.name}</Link></li>)}</ul>
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-4">Who we serve</p>
          <ul className="space-y-2">
            <li><Link href="/landlords">Landlords</Link></li>
            <li><Link href="/portfolio-owners">Portfolio owners</Link></li>
            <li><Link href="/property-managers">Property managers</Link></li>
            <li><Link href="/real-estate-investors">Investors & brokers</Link></li>
            <li><Link href="/hoa-condos">HOAs & condos</Link></li>
            <li><Link href="/general-contracting">General contracting</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-bronze-2 mb-4">Markets</p>
          <ul className="space-y-2">{markets.map((m) => <li key={m.id}><Link href={`/markets/${m.id}`}>{m.short}</Link></li>)}</ul>
          <p className="eyebrow !text-bronze-2 mt-6 mb-3">Company</p>
          <ul className="space-y-2">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/projects">Projects</Link></li>
            <li><Link href="/resources">Resources</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-paper/50">
          <span>© {new Date().getFullYear()} {site.legalName}</span>
          <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span>
        </Container>
      </div>
    </footer>
  );
}
