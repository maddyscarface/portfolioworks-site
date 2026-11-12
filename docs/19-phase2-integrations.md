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

Create these three pipelines with exactly the stages in specs/03 §3 (`PROJECT_STAGES` / `PARTNERSHIP_STAGES` in `src/config/ghl.ts`), then paste each ID into `GHL_STAGE_<PIPELINE>_<STAGE>`. The full list is in `.env.example`.

| Pipeline | Who | Stages |
|---|---|---|
| PortfolioWorks · Projects (`GHL_PIPELINE_MAIN`) | Landlords, PMs (one-off jobs), investors, HOAs | New inquiry → Qualified → Walkthrough requested → Walkthrough completed → Scope developing → Proposal sent → Awarded → In progress → Closeout → Repeat opportunity |
| PortfolioWorks · Residential owner projects (`GHL_PIPELINE_RESIDENTIAL`) | Homeowners renovating their own residence | Same ten stages, kept separate so consumer leads never mix with PM opportunities |
| PortfolioWorks · Portfolio & recurring contracts (`GHL_PIPELINE_PARTNERSHIP`) | Portfolio funnel, PMs/owners/HOAs with 10+ units or recurring work | Prospect → Contact verified → Consultation → Vendor prequalification → Pilot property → Approved vendor → Recurring work → Expansion |

- Lost / not a fit is the GHL opportunity **status** ("lost"), not a stage. Awarded and Approved vendor set status "won".
- Lead intake needs only `GHL_STAGE_<MAIN|RESIDENTIAL>_NEW_INQUIRY` and `GHL_STAGE_PARTNERSHIP_PROSPECT`. `GHL_STAGE_MAIN_NEW_LEAD` is still accepted for the main pipeline.
- Non-launch markets (Southeast Florida, Southern Maine) enter New inquiry with the `pw-fu:waitlist` tag; nothing is scheduled until licensed.
- Contact fields added for specs/03 §3 associations: `pw_buyer_role`, `pw_urgency`, `pw_property_addresses`, plus every funnel answer as `pw_d_<key>` (see `src/config/funnel-fields.ts`). Funnel answers, plans and photo links stay in GHL / Upstash and are never sent to ad or intent platforms.

Routing (`pipelineFor` in `src/lib/leads.ts`):
- The `portfolio` funnel goes to the partnership pipeline.
- A property manager, portfolio owner or HOA with 10 or more units, or with a recurring contract, also goes to the partnership pipeline.
- Customer type `homeowner` goes to the residential pipeline.
- Everything else goes to the main pipeline.
- Optional per-market pipelines: `GHL_PIPELINE_MA|FL|ME` plus `GHL_STAGE_<MA|FL|ME>_NEW_INQUIRY`.

What one website lead does:
1. **Duplicate-safe contact upsert.** Uses `/contacts/upsert`, matched on email/phone.
2. **Tags.** Adds `co:portfolioworks`, funnel, market, `pw-tier:<hot|warm|nurture>` and `sms-consent`. Stale tier tags are removed.
3. **Opportunity.** Searches for an existing open opportunity for the contact in that pipeline and updates it. Creates one only if none exists, so a re-submission never duplicates.
4. **Note.** Adds a note with the score, the reasons, and first- and last-touch attribution.
5. **Follow-up hooks.** Adds a tag. If `GHL_WORKFLOW_*` is set, it also enrolls the contact in that workflow directly:
   - `pw-fu:instant-response`: every lead in a launch market (docs/08 workflow 1).
   - `pw-fu:speed-to-lead`: hot leads only (workflow 1, hot branch).
   - `pw-fu:photo-request`: turnover, trade or urgent leads with no photos (workflow 2).
   - `pw-fu:warm-nurture` / `pw-fu:long-nurture`: warm and nurture tiers.
   - `pw-fu:partnership`: partnership pipeline.
   - `pw-fu:urgent`: urgent-turnover funnel. This is an internal priority alert only; no response time is promised on the site.
   - `pw-fu:waitlist`: Florida or Maine (workflow 14).
   - `pw-fu:out-of-area`: outside all markets (workflow 15).
   - Workflows 3–13 are triggered by stage changes inside GHL, so the site needs no hook for them.

   Build each GHL workflow with the trigger "Tag added = <tag>". SMS steps must check `sms-consent`.

Scoring weights are owner-editable in `src/config/lead-scoring.ts`.

**Stage changes → ads.** A GHL workflow on "Opportunity stage changed" POSTs to `/api/crm-webhook`:
- Header: `x-pw-webhook-secret: $CRM_WEBHOOK_SECRET`.
- Body: `{eventId, stage, value, email, phone, gaClientId, gclid}`.
- `stage` is one of the specs/03 §4 events: `qualified_lead`, `walkthrough_scheduled`, `walkthrough_completed`, `estimate_sent`, `proposal_won`, `realized_revenue`, `lost`. The older names `site_walk_booked`, `proposal_sent`, `contract_signed`, `purchase` still work.
- Project pipelines move to Qualified / Walkthrough requested / Walkthrough completed / Proposal sent / Awarded / Closeout. Partnership leads move to Contact verified / Consultation / Consultation / Pilot property / Approved vendor / Recurring work.
- The response reports the stage in `crmStage`.
- Each (eventId, stage) pair is processed once.
- `proposal_won` (deal value) and `realized_revenue` (actual final revenue) go to the revenue ledger with first- and last-touch attribution; `/api/attribution/summary` reports `dealValue` and `realizedRevenue` separately. They are also sent to Meta CAPI and GA4 (`purchase` with `transaction_id`).
- Google Ads offline CSV rows: one conversion action per event ("PortfolioWorks - Qualified Lead / Walkthrough Scheduled / Estimate Sent / Proposal Won / Realized Revenue").

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

Browser funnel events:
- `view_service`: on `/services/*` and `/rental-turnovers`.
- `form_start`, `property_intake_completed`, `estimator_used`.
- Each one is pushed to the dataLayer for GTM. It is also sent straight to GA4 when GA4 is loaded directly rather than through GTM.

Attribution:
- UTMs and click IDs (gclid, gbraid, wbraid, fbclid, msclkid, ttclid, li_fat_id) persist for 90 days.
- First touch is kept; last touch and the touch count are updated on each visit.
- Both travel with every lead.

## 4. Revenue attribution reports
Set `ATTRIBUTION_EXPORT_SECRET` to enable these. Without it they return 404. Send the secret in the header `x-pw-report-key` or as `?key=`.
- `/api/attribution/summary`: revenue by channel and campaign (first and last touch).
- `/api/attribution/google-ads-offline`: CSV for a Google Ads **scheduled upload**. It covers the last 90 days of conversions that have a Google click ID, one conversion action per stage, following the docs/11 event map:
  - "PortfolioWorks - Qualified Lead"
  - "PortfolioWorks - Site Walk Booked"
  - "PortfolioWorks - Contract Signed" (with value)
  - "PortfolioWorks - Paid" (with value)
  - Rename any of them with `GOOGLE_ADS_CONV_<STAGE>`. `proposal_sent` is not uploaded, per the spec.

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

## 8. Production storage guard (specs/03 §6)
- Without Upstash, `/api/leads` returns 503 in production and `/api/health` reports `lead_intake: blocked`.
- `LEAD_ALLOW_MEMORY_STORE=1` relaxes this only on non-production deploys (local, Vercel Preview / staging). It is ignored when `VERCEL_ENV=production`.
- **Owner action:** the Vercel project variable `LEAD_ALLOW_MEMORY_STORE=1` currently targets Production as well as Preview. Remove the Production target (keep Preview) and add `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` before this branch is merged, or production lead intake will return 503 by design.
