/**
 * Feature flags and environment switches (all default to the safe/off state).
 *
 * PORTAL: /portal was a public prototype rendering demo data. It is now hidden from navigation and
 * the route shows a "client access" holding page unless NEXT_PUBLIC_PORTAL_PREVIEW=true. Real client
 * sign-in is not built yet (see docs/09); never enable the preview on production.
 *
 * NOINDEX: staging/preview deployments must never be indexed. Indexing requires ALL of:
 *   - NEXT_PUBLIC_INDEXABLE_SITE=true (explicit owner launch flag)
 *   - a canonical host that is not a vercel.app URL
 *   - not a Vercel preview, and not SITE_NOINDEX / NEXT_PUBLIC_SITE_NOINDEX
 */
export function computeNoindex(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.NEXT_PUBLIC_CANONICAL_URL || env.NEXT_PUBLIC_SITE_URL || "";
  let unverifiedHost = true;
  if (raw) {
    try {
      unverifiedHost = new URL(raw).hostname.endsWith("vercel.app");
    } catch {
      unverifiedHost = true;
    }
  }
  return (
    env.SITE_NOINDEX === "1" ||
    env.NEXT_PUBLIC_SITE_NOINDEX === "1" ||
    env.VERCEL_ENV === "preview" ||
    env.NEXT_PUBLIC_INDEXABLE_SITE !== "true" ||
    unverifiedHost
  );
}

export const flags = {
  portalPreview: process.env.NEXT_PUBLIC_PORTAL_PREVIEW === "true",
  noindex: computeNoindex(),
};
