# 19 · Phase 2 — redesign, CRM, tracking and attribution (owner setup)

Branch: `phase2-dev` · Staging: https://portfolioworks-staging.vercel.app (Vercel *preview*, noindex) · Production is untouched until this branch is merged.

Everything below ships **inactive**. Each item switches on only when its environment variables are set in Vercel. Use the **Preview** scope first, then **Production** after testing. `/api/health` shows which items are configured. It never shows the values themselves.

## 1. Design and photography
- The site uses a photography-led layout with the existing brand: navy/bronze palette, the logo, and the Iowan/Palatino serif plus Inter.
- `public/photos/` holds 20 free-licence photos from Pexels. Each has its own entry in `public/photos/manifest.json` with source URL, photographer, licence and alt text.
- Every stock image carries an "Illustrative" tag, and the footer has a disclosure. **None of these photos is PortfolioWorks work.**
- Real project photos go on `/projects`. Publish them only with the owner's permission. Until then, that page shows honest placeholders.
- Founder credentials (Cornell/WPI) stay hidden until `founder.credentialsVerified` is set to `true` in `src/config/site.ts`, after verification.
- `/portal` shows a holding page. The demo-data prototype appears only when `NEXT_PUBLIC_PORTAL_PREVIEW=true`. Do not enable it on production: it is not a real, authenticated portal.

## 2. GoHighLevel (PortfolioWorks sub-account only)
Mode: `GHL_MODE=live|log|off`.
- If unset, the mode is `live` when both `GHL_PRIVATE_TOKEN` and `GHL_LOCATION_ID` exist, and `log` otherwise.
- `log` mode writes the redacted plan to the function logs and calls nothing.

Create these two pipelines and paste their IDs into the env vars listed in `.env.example`:

| Pipeline | Stages (env) |
|---|---|
| PortfolioWorks · Turnovers & Projects (`GHL_PIPELINE_MAIN`) | New lead → Qualified → Walkthrough booked → Proposal sent → Won / Lost |
| PortfolioWorks · Portfolio Partnerships (`GHL_PIPELINE_PARTNERSHIP`) | Prospect → Qualified → Discovery booked → Pilot proposed → Approved vendor / Lost |

Routing (`pipelineFor` in `src/lib/leads.ts`):
- The `portfolio` funnel goes to the partnership pipeline.
- A property manager, portfolio owner or HOA with 10 or more units, or with a recurring contract, also goes to the partnership pipeline.
- Everything else goes to the main pipeline.
- Optional per-market pipelines: `GHL_PIPELINE_MA|FL|ME` plus `GHL_STAGE_<MA|FL|ME>_NEW_LEAD`.

What one website lead does:
1. **Duplicate-safe contact upsert.** Uses `/contacts/upsert`, matched on email/phone.
2. **Tags.** Adds `co:portfolioworks`, funnel, market, `pw-tier:<hot|warm|nurture>` and `sms-consent`. Stale tier tags are removed.
3. **Opportunity.** Searches for an existing open opportunity for the contact in that pipeline and updates it. Creates one only if none exists, so a re-submission never duplicates.
4. **Note.** Adds a note with the score, the reasons, and first- and last-touch attribution.
5. **Follow-up hooks.** Adds a tag. If `GHL_WORKFLOW_*` is set, it also enrolls the contact in that workflow directly:
   - `pw-fu:speed-to-lead`: hot lead in a served market.
   - `pw-fu:warm-nurture` / `pw-fu:long-nurture`: warm and nurture tiers.
   - `pw-fu:partnership`: partnership pipeline.
   - `pw-fu:urgent`: urgent-turnover funnel.
   - `pw-fu:out-of-area`: outside the launch markets.

   Build each GHL workflow with the trigger "Tag added = <tag>". SMS steps must check `sms-consent`.

Scoring weights are owner-editable in `src/config/lead-scoring.ts`.

**Stage changes → ads.** A GHL workflow on "Opportunity stage changed" POSTs to `/api/crm-webhook`:
- Header: `x-pw-webhook-secret: $CRM_WEBHOOK_SECRET`.
- Body: `{eventId, stage, value, email, phone, gaClientId, gclid}`.
- `stage` is one of: `qualified_lead`, `site_walk_booked`, `proposal_sent`, `contract_signed`, `purchase`, `lost`.
- Each (eventId, stage) pair is processed once.
- Won and paid stages are written to the revenue ledger with first- and last-touch attribution. They are also sent to Meta CAPI and to GA4 (`purchase` with `transaction_id`).

## 3. Pixels and conversion tracking
All of these load only after the visitor accepts the cookie banner. Global Privacy Control counts as a decline.

| Tag | Env |
|---|---|
| Google Tag Manager | `NEXT_PUBLIC_GTM_ID`. Set `NEXT_PUBLIC_TAGS_VIA_GTM=true` if GA4, Ads and Meta are configured inside GTM. |
| GA4 (browser + Measurement Protocol) | `NEXT_PUBLIC_GA4_ID`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` |
| Google Ads lead conversion + enhanced conversions | `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` |
| Meta Pixel + Conversions API | `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN` (`META_TEST_EVENT_CODE` while testing) |
| OpenAI (ChatGPT) Ads | `NEXT_PUBLIC_OPENAI_PIXEL_ID`, `OPENAI_ADS_PIXEL_ID`, `OPENAI_ADS_API_KEY`. Set `OPENAI_ADS_VALIDATE_ONLY=false` at launch. |

Deduplication:
- The browser pixel and the server event share the lead `eventId`: Meta `eventID`/`event_id`, Google Ads `transaction_id`, GA4 `transaction_id`.

Attribution:
- UTMs and click IDs (gclid, gbraid, wbraid, fbclid, msclkid, ttclid, li_fat_id) persist for 90 days.
- First touch is kept; last touch and the touch count are updated on each visit.
- Both travel with every lead.

## 4. Revenue attribution reports
Set `ATTRIBUTION_EXPORT_SECRET` to enable these. Without it they return 404. Send the secret in the header `x-pw-report-key` or as `?key=`.
- `/api/attribution/summary`: revenue by channel and campaign (first and last touch).
- `/api/attribution/google-ads-offline`: CSV for a Google Ads **scheduled upload** (offline conversions with a gclid from the last 90 days). The conversion action name comes from `GOOGLE_ADS_OFFLINE_CONVERSION_NAME`.

Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`) is required in production for the lead store, the dedup keys and the ledger.

## 5. Spam protection
Cloudflare Turnstile needs **both** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. The honeypot and minimum-time checks stay on regardless.

## 6. Intent data (DataMoon / AudienceLab): off by default
- `INTENT_PROVIDER=datamoon|audiencelab`, `INTENT_ENABLED=true` (the kill switch), `INTENT_API_KEY`, `INTENT_API_URL`.
- Webhook: `/api/intent/webhook` with header `x-intent-secret: $INTENT_WEBHOOK_SECRET`. It returns 404 while disabled, and it only tags contacts that already exist.
- Optional browser pixel: `NEXT_PUBLIC_INTENT_ENABLED=true` + `NEXT_PUBLIC_INTENT_PIXEL_SRC`. It loads after ad consent only.
- Do **not** enable any of this until the provider contract and a privacy review (CCPA/state privacy laws, consent language) are done. Leads are forwarded only when the visitor gave ad consent.

## 7. Staging and SEO
- Vercel preview deployments (`VERCEL_ENV=preview`) send `X-Robots-Tag: noindex, nofollow`, a robots meta tag, and `Disallow: /`.
- Production is unaffected. `SITE_NOINDEX=1` forces noindex anywhere.
- Canonical URLs and the sitemap keep pointing at `NEXT_PUBLIC_SITE_URL`.
