/**
 * Feature flags and environment switches (all default to the safe/off state).
 *
 * PORTAL: /portal was a public prototype rendering demo data. It is now hidden from navigation and
 * the route shows a "client access" holding page unless NEXT_PUBLIC_PORTAL_PREVIEW=true. Real client
 * sign-in is not built yet (see docs/09); never enable the preview on production.
 *
 * NOINDEX: staging/preview deployments must never be indexed. Vercel sets VERCEL_ENV=preview on
 * every non-production deployment; SITE_NOINDEX=1 forces it anywhere else.
 */
export const flags = {
  portalPreview: process.env.NEXT_PUBLIC_PORTAL_PREVIEW === "true",
  noindex: process.env.VERCEL_ENV === "preview" || process.env.SITE_NOINDEX === "1" || process.env.NEXT_PUBLIC_SITE_NOINDEX === "1",
};
