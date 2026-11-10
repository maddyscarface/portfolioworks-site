import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/ui";
import Tracking from "@/components/Tracking";
import { CONSENT_DEFAULT_JS } from "@/lib/consent";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "PortfolioWorks | Rental Turnovers, Renovations & Portfolio Contracting", template: "%s" },
  description: site.heroSub,
  openGraph: { siteName: site.name, type: "website" },
  alternates: { canonical: "/" },
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: site.legalName,
  url: site.url,
  slogan: site.tagline,
  areaServed: ["Greater Boston, MA"],
  knowsAbout: ["Rental turnovers", "Apartment make-ready", "Multifamily renovation", "Residential rehabilitation"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_JS }} />
      </head>
      <body>
        <Tracking />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
