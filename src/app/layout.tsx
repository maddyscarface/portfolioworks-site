import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/ui";
import Tracking from "@/components/Tracking";
import { CONSENT_DEFAULT_JS } from "@/lib/consent";
import { site } from "@/config/site";
import { flags } from "@/config/flags";
import { Inter, Source_Serif_4 } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif-fallback", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "PortfolioWorks | Rental Turnovers, Renovations & Portfolio Contracting", template: "%s" },
  description: site.heroSub,
  openGraph: { siteName: site.name, type: "website" },
  alternates: { canonical: "/" },
  // Staging / preview deployments are never indexed (see src/config/flags.ts).
  ...(flags.noindex ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } } : {}),
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
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
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
