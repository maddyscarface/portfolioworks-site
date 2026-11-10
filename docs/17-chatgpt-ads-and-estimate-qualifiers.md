# 17. ChatGPT ads (OpenAI pixel + Conversions API) and pre-estimate qualifiers

Added 2026-11-03.

## 1. OpenAI Ads measurement

| Piece | Where | What it does |
|---|---|---|
| Pixel | `src/lib/openai-ads/client.ts`, loaded from the tracking component | Loads `bzrcdn.openai.com/sdk/oaiq.min.js` only when `NEXT_PUBLIC_OPENAI_PIXEL_ID` is set. Calls `oaiq("consent", …)` **before** `init`. Consent comes from opt-in: `pw_consent === "granted"` and no GPC. |
| Lead conversion (browser) | lead form success handler | `oaiq("measure", "lead_created", {type:"customer_action"}, {event_id})`, only with ad consent, once per submission. |
| Lead conversion (server) | lead API → `sendOpenAiEvent` | POST `https://bzr.openai.com/v1/events?pid=…` with the **same id** as the pixel `event_id` → OpenAI keeps one conversion. Email/phone/name hashed (SHA-256, OpenAI normalisation); `__obref` / `__oppref` forwarded. Skipped without ad consent. |
| Pipeline stages | CRM webhook | booked visit/walkthrough → `appointment_scheduled` (standard event you can optimise to); qualified → `qualified_lead`; estimate/proposal sent → `estimate_sent`; won/contract → `job_won` (with value); paid → `job_paid`. Events older than 7 days are rejected by OpenAI. |
| Crawlers | `src/app/robots.ts` | `OAI-AdsBot` and `OAI-SearchBot` can read every landing page (ads are rejected if the ad reviewer is blocked). |

CRM webhook: `/api/crm-webhook` (header `x-pw-webhook-secret`). OpenAI refs are read from the stored lead by `eventId`.

### Environment

```
NEXT_PUBLIC_OPENAI_PIXEL_ID=     # Ads Manager → Conversions
OPENAI_ADS_PIXEL_ID=             # same id (server)
OPENAI_ADS_API_KEY=              # Conversions API key (server only)
OPENAI_ADS_VALIDATE_ONLY=true    # set false at launch
NEXT_PUBLIC_OPENAI_PIXEL_DEBUG=  # "true" logs pixel activity while testing
```
`OPENAI_ADS_ENDPOINT` and `RESEND_API_BASE` exist only for local tests (mock servers). Leave them unset in production.

If you add a Content-Security-Policy later, allow `script-src https://bzrcdn.openai.com`, `connect-src https://bzr.openai.com https://bzrcdn.openai.com`, `img-src https://bzr.openai.com`.

### Launch checklist
1. Create the pixel + API key in Ads Manager → Conversions; fill the env vars; deploy with `OPENAI_ADS_VALIDATE_ONLY=true`.
2. Submit one test lead; confirm the event in Ads Manager's test view, then set validate-only to `false`.
3. Choose **lead_created** (or appointment_scheduled once volume allows) as the campaign conversion goal. The goal cannot be changed after a campaign is created.
4. Tag ad URLs with `utm_source=chatgpt&utm_medium=cpc&utm_campaign=…` so GA4 and GHL attribute the lead.

## 2. Pre-estimate qualifiers (no price shock)

Config: **`src/config/estimate.ts`**. Shared logic: `src/lib/estimate/qualifiers.ts`; UI: `src/components/estimate/EstimateQualifiers.tsx`.

Form flow: Turnover, urgent, rehab, trade and walkthrough funnels: Who & what → Details → **Budget & walkthrough** → Contact. Portfolio partnership and contact forms are unchanged. The old Timeline/Budget selects moved into the new step (values map onto the same `timeline` / `budget` enums).

What the customer answers, and why:
- **Project type + closest size + add-ons**: the form immediately shows the *typical range* for that scope, before they pick a budget. This is the anti-price-shock step.
- **Budget band** (required; "Not sure yet" allowed). If the band is under the typical range, the form says so kindly and the team gets a warning.
- **Start timing**, **preferred visit date + time**, **favourite looks / finish level**, **address** (where relevant).
- **Saw pricing**: counted automatically (price-guide sections, the estimator, and the in-form range) → "Yes · viewed 2×".

Server side, answers are sanitised against the config (unknown ids dropped), added to the lead score, and written to the CRM:

| GHL field | Example |
|---|---|
| `pw_est_project_type` / `pw_est_size` / `pw_est_add_ons` | New deck: composite / 16×20 (320 sq ft) / Stairs |
| `pw_est_budget` / `pw_est_typical_range` / `pw_est_budget_fit` | $25–35k / $21k–$40k / within · low_end · below · above · unknown |
| `pw_est_offer_guidance` | "Budget fits the typical … Quote the standard scope and offer one upgrade." |
| `pw_est_start` / `pw_est_preferred_date` / `pw_est_preferred_time` | Within 30 days / 2026-11-12 / 12:00 PM (Eastern Time) |
| `pw_est_favorites` / `pw_est_saw_pricing` / `pw_est_address` | Modern gray composite, Cable railings / yes (2x) / 12 Maple Ave… |
| `pw_openai_obref` / `pw_openai_oppref` | pass back in the stage webhook |

Create these custom fields in GHL. Use `pw_est_budget_fit = below` as a workflow trigger for a "reset expectations" call task before the visit.

## 3. Team lead brief email

Every estimate request sends the team an email like the reference design: requested time + **Add to calendar** (Google Calendar, correct time zone), Budget / Start / Saw-pricing tiles, the project line, favourites, **How to shape the offer**, and the customer's contact details.
Env: RESEND_API_KEY, LEAD_BRIEF_FROM, LEAD_BRIEF_TO.

## 4. Owner to confirm before launch
- Every `typical` range in `src/config/estimate.ts` (they are placeholders), then set `rangesConfirmed: true`. Until then the team email notes "placeholder ranges".
- Favourites: replace style options with real past projects (with written permission) as they are published.
- No schema change.

## 5. Updates (2026-11-04)
- **CSP:** `next.config` sends a Content-Security-Policy that allows `bzrcdn.openai.com` (script/connect) and `bzr.openai.com` (connect/img) plus GTM/GA4, Meta, Turnstile, GHL embeds and Supabase. It ships as **Report-Only**; set `CSP_ENFORCE=true` (build-time) to enforce once the browser console shows no violations with your live GTM container. The e2e passes with it enforced.
- **Storage guard:** in production `/api/leads` returns 503 if Upstash is not configured (never keeps leads in process memory). `LEAD_ALLOW_MEMORY_STORE=1` is for local tests only.
- **`.env.example`** now lists every variable the code reads.
- **Health:** `GET /api/health`. **Scripts:** `npm test`, `npm run typecheck`.
- **E2E:** `npm run e2e:chatgpt-ads` (see `tests/e2e-chatgpt-ads/README.txt`) builds with a test pixel id, runs against local mocks and stops. Covers consent-declined for all four sites. Rebuild before deploying.
- **Ranges:** still `rangesConfirmed: false` — the owner must confirm each `typical` range.
