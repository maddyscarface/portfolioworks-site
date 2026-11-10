# PortfolioWorks Contracting & Property Services

**One Partner. Every Property. Every Project.**
Website, lead capture, estimator tools, CRM adapters, portal prototypes and the full go-to-market pack for a rental turnover, rehab and portfolio contracting business serving Greater Boston (launch), Southeast Florida (licensing pending) and Southern Maine (evaluation).

## What's here
| Area | Location |
|---|---|
| Website (40+ routes incl. 10 service pages, 6 ICP pages, 3 markets, 22 town pages, 5 funnels) | `src/app/` |
| Editable content & config (brand, services, audiences, markets, funnels, price sheet, SEO briefs) | `src/config/` |
| 3-step lead form (7 funnel variants), consent + attribution | `src/components/LeadForm.tsx`, `Tracking.tsx` |
| Turnover estimator, vacancy calculator, portfolio planner | `src/lib/calculators.ts`, `src/components/Tools.tsx` |
| Lead API (validation, scoring, routing, spam, idempotency) | `src/app/api/leads`, `src/lib/leads.ts` |
| GHL, Meta CAPI, GA4 MP, Upstash, Turnstile adapters | `src/lib/integrations.ts` |
| CRM stage → offline conversion webhook | `src/app/api/crm-webhook` |
| Scope-of-work / proposal generator | `src/lib/sow.ts` |
| Client portal & ops dashboard prototypes | `src/app/portal`, `src/app/admin`, `src/lib/portal-data.ts` |
| Production DB schema with RLS | `docs/db/schema.sql` |
| Tests (16 unit + E2E smoke) | `tests/` |
| Strategy, campaigns, CRM, ops, launch docs | `docs/01–16` |

## Docs index
01 Brand & design system · 02 Website architecture · 03 Funnels · 04 Google Ads · 05 Meta Ads · 06 Intent/ABM · 07 Outbound (LinkedIn/email/calls) · 08 GoHighLevel · 09 Portal & field ops · 10 Offers, proposals & SOW · 11 Tracking & attribution · 12 SEO/AEO · 13 Executive reporting · 14 Vendor & project workflows · 15 90-day plan · 16 Technical deployment

## Status
Verified locally: typecheck clean, 16 unit tests pass, production build OK, E2E smoke passes (all routes 200, unserved towns 404, single `generate_lead` with event_id, attribution captured, no re-fire on reload, lead visible in admin, portal account scoping, API validation/idempotency).

**Not connected or validated:** GoHighLevel, Meta Pixel/CAPI, GA4, Google Ads, GTM, Upstash, Turnstile, call tracking, booking calendars, domain, hosting, real auth/DB. Each needs credentials + QA (doc 11, doc 16).

Quick start: see `docs/16-technical-deployment.md`.
