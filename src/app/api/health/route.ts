import { NextResponse } from "next/server";
import { integrationStatus, memoryStoreBlocked } from "@/lib/integrations";
import { ghlStatus } from "@/lib/crm/ghl";
import { intentConfig } from "@/lib/intent";
import { flags } from "@/config/flags";

export const dynamic = "force-dynamic";

/**
 * Reports which integrations have credentials present. "configured" ≠ "working": verify each one
 * end-to-end with the QA / launch checklist before going live. Booleans only — never secret values.
 */
export function GET() {
  return NextResponse.json({
    ok: !memoryStoreBlocked(),
    configured: {
      ...integrationStatus(),
      crm_webhook_secret: Boolean(process.env.CRM_WEBHOOK_SECRET),
      admin_password: Boolean(process.env.ADMIN_PASSWORD),
      lead_brief: Boolean(process.env.RESEND_API_KEY && process.env.LEAD_BRIEF_FROM && process.env.LEAD_BRIEF_TO),
      openai_pixel: Boolean(process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID),
      openai_capi: Boolean(process.env.OPENAI_ADS_PIXEL_ID && process.env.OPENAI_ADS_API_KEY),
      openai_validate_only: process.env.OPENAI_ADS_VALIDATE_ONLY !== "false",
      ga4_browser: Boolean(process.env.NEXT_PUBLIC_GA4_ID),
      google_ads_browser: Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID && process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL),
      meta_pixel_browser: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      tags_via_gtm: process.env.NEXT_PUBLIC_TAGS_VIA_GTM === "true",
      turnstile_widget: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
      attribution_reports: Boolean(process.env.ATTRIBUTION_EXPORT_SECRET),
    },
    ghl: ghlStatus(),
    intent: (({ provider, enabled }) => ({ provider: provider ?? null, enabled }))(intentConfig()),
    site: { noindex: flags.noindex, portal_preview: flags.portalPreview, env: process.env.VERCEL_ENV ?? process.env.NODE_ENV },
    lead_intake: memoryStoreBlocked() ? "blocked: Upstash not configured in production" : "ok",
    note: "Credentials present does not mean the integration is verified. See docs/16-technical-deployment.md.",
  });
}
