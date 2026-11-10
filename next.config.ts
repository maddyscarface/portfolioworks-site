import type { NextConfig } from "next";

/**
 * Content-Security-Policy. Allows the OpenAI Ads pixel (script bzrcdn.openai.com, beacons
 * bzr.openai.com) plus GTM/GA4, Meta, Cloudflare Turnstile, GoHighLevel embeds and Supabase uploads.
 * Shipped as Report-Only so nothing a GTM container injects can break at launch: check the browser
 * console for violations, add any extra hosts below, then set CSP_ENFORCE=true to enforce.
 * 'unsafe-inline' is required for the inline pixel/GTM loaders and Next.js bootstrap scripts.
 */
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://bzrcdn.openai.com https://www.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://challenges.cloudflare.com`,
  "connect-src 'self' https://bzr.openai.com https://bzrcdn.openai.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://*.supabase.co https://challenges.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src 'self' https://*.leadconnectorhq.com https://*.msgsndr.com https://link.msgsndr.com https://challenges.cloudflare.com https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const cspHeader = { key: process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp };

const securityHeaders = [
  cspHeader,
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
