import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/ui";
import { SiteChrome } from "@/components/layout/SiteChrome";
import Tracking from "@/components/Tracking";
import { CONSENT_DEFAULT_JS } from "@/lib/consent";
import { flags } from "@/config/flags";
import { Inter, Source_Serif_4 } from "next/font/google";
import { canonicalBase, JsonLd, organizationGraph, pageMeta } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif-fallback", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(canonicalBase()),
  ...pageMeta({
    title: "Rental Turnovers & Renovations | PortfolioWorks",
    description: "One coordinated team for rental turnovers, renovations and recurring property work across Greater Boston, for landlords, investors and managers.",
    path: "/",
    image: "/photos/hero-rent-ready-living-room.jpg",
  }),
  title: {
    default: "Rental Turnovers & Renovations | PortfolioWorks",
    template: "%s",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  // Staging / unverified hosts stay noindex even if a page omits robots.
  ...(flags.noindex ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#142036",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_JS }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:text-navy">
          Skip to content
        </a>
        <SiteChrome><Tracking /></SiteChrome>
        <JsonLd data={organizationGraph()} />
        <SiteChrome><Header /></SiteChrome>
        <main id="main">{children}</main>
        <SiteChrome><Footer /></SiteChrome>
      </body>
    </html>
  );
}
