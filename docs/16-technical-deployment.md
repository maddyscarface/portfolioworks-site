# 16 — Technical Deployment

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Zod · Vitest · Python Playwright smoke tests. Lead store: Upstash Redis (REST) with in-memory fallback for local dev. Target host: Vercel.

## Local
```bash
npm install
npm run dev                      # http://localhost:3000
npx vitest run                   # unit tests
npx tsc --noEmit                 # typecheck
npm run build && ALLOW_DEMO_ADMIN=true npx next start -p 3100
python3 tests/e2e_smoke.py http://localhost:3100
```

## Environment variables
| Var | Required | Purpose | Status |
|---|---|---|---|
| NEXT_PUBLIC_SITE_URL | yes | canonical URLs, sitemap | set at deploy |
| NEXT_PUBLIC_PHONE | no | header/contact phone (tracking number) | not set |
| NEXT_PUBLIC_GTM_ID | for tracking | GTM container | **not connected** |
| UPSTASH_REDIS_REST_URL / _TOKEN | prod | lead store, rate limit, idempotency | **not connected** (memory fallback is NOT durable) |
| TURNSTILE_SECRET_KEY (+ site key widget) | recommended | bot protection | **not connected**; widget not yet rendered in form |
| GHL_PRIVATE_TOKEN, GHL_LOCATION_ID | yes | contact/opportunity push | **not connected** |
| GHL_PIPELINE_MAIN, GHL_STAGE_MAIN_NEW_LEAD | yes | main pipeline | **not connected** |
| GHL_PIPELINE_PARTNERSHIP, GHL_STAGE_PARTNERSHIP_PROSPECT | yes | partnership pipeline | **not connected** |
| GHL_CALENDAR_MA / _FL / _ME | for booking | calendar links | not set |
| META_PIXEL_ID, META_CAPI_TOKEN, META_TEST_EVENT_CODE | for Meta | CAPI | **not connected** |
| NEXT_PUBLIC_OPENAI_PIXEL_ID | for ChatGPT ads | OpenAI pixel (opt-in consent) | **not connected** |
| OPENAI_ADS_PIXEL_ID, OPENAI_ADS_API_KEY, OPENAI_ADS_VALIDATE_ONLY | for ChatGPT ads | OpenAI Conversions API | **not connected** |
| RESEND_API_KEY, LEAD_BRIEF_FROM, LEAD_BRIEF_TO | recommended | team lead-brief email | not set |
| GA4_MEASUREMENT_ID, GA4_API_SECRET | for GA4 MP | server events | **not connected** |
| CRM_WEBHOOK_SECRET | yes | protects /api/crm-webhook | not set (endpoint returns 401 until set) |
| ADMIN_PASSWORD | yes in prod | basic auth for /admin | not set (prod /admin = 404 until set) |
| ALLOW_DEMO_ADMIN | demo only | open /admin in prod without password | never in real prod |

## Deploy (Vercel)
1. Push repo to GitHub (private) → import in Vercel.
2. Set env vars for Preview and Production separately (use META_TEST_EVENT_CODE on Preview).
3. Domain → Vercel DNS; add `www` redirect.
4. Upstash Redis via Vercel Marketplace (auto-injects REST vars).
5. Run doc 11 QA on the Preview URL; then promote.

## Security notes
- `/api/leads`: Zod validation, honeypot, min fill time, IP rate limit (8/10 min), optional Turnstile, idempotent `eventId`. Spam is accepted silently and dropped.
- PII sent to Meta is SHA-256 hashed; IP/UA sent for match quality per Meta spec.
- `/admin` is basic-auth only — **replace with real auth before storing real client data** (Supabase Auth + RLS per `docs/db/schema.sql`).
- `/portal` is a prototype with demo data; its `?acct=` switcher must be removed when real auth lands.
- Photo uploads: current form accepts links only. Production: Supabase Storage signed upload URLs or GHL form file upload (workflow #2).

## Known gaps / next increments
1. Real auth + Postgres for portal/admin (doc 09).
2. Turnstile widget in `LeadForm` (server verify already implemented).
3. Direct photo upload.
4. `/resources/[slug]` MDX article route once articles are written.
5. Google Ads API offline upload (option C, doc 11).
6. Field app routes for coordinators/subs.

## Launch gates (must be cleared)
1. Entity, MA HIC/CSL, insurance — fill `credentialsByMarket.massachusetts`.
2. Real price sheet.
3. Founder credential wording confirmed.
4. Legal review: privacy, terms, proposal/contract templates.
5. Trademark/domain clearance.
6. Meta campaigns set to Housing Special Ad Category.
7. Real photography (no stock presented as our work).
8. FL/ME remain non-launch until licensing, insurance and crew capacity are verified.
