# 11 — Pixel, Conversion & Attribution Infrastructure

**Status: code implemented; no platform connected or validated.** Every item below needs credentials and end-to-end QA on staging before ads launch.

## What the site already does
| Capability | Where |
|---|---|
| Consent Mode v2 defaults (denied) in `<head>` before GTM; banner updates consent | `src/lib/consent.ts`, `src/components/Tracking.tsx` |
| GTM container load (when `NEXT_PUBLIC_GTM_ID` set) | `Tracking.tsx` |
| First-touch attribution: UTMs, gclid/gbraid/wbraid, fbclid → `_fbc`, landing page, referrer; click IDs refresh on later paid clicks | `Tracking.tsx` (`pw_attr` localStorage) |
| `form_start`, `generate_lead` (+ `event_id`, funnel, customer_type, market, lead_tier), `property_intake_completed`, `estimator_used`, `estimator_cta` dataLayer events | `LeadForm.tsx`, `Tools.tsx` |
| Conversion fires only on API success — **not** on /thank-you (reload-safe) | `LeadForm.tsx` |
| Server-side Meta CAPI `Lead` with same `event_id` (dedup), hashed em/ph/zp, fbc/fbp, IP, UA | `/api/leads` → `sendMetaEvent` |
| Attribution + event_id stored on lead and pushed to GHL custom fields | `/api/leads` → `pushToGhl` |
| CRM stage → CAPI + GA4 MP events (`qualified_lead`, `site_walk_booked`, `proposal_sent`, `contract_signed`, `purchase`) | `/api/crm-webhook` |

## GTM container plan
**Variables:** DLV event_id, funnel, customer_type, market, lead_tier; user-provided data (email/phone from a dataLayer `user_data` push — add on success step if enhanced conversions via GTM is preferred over server upload).
**Tags:**
1. GA4 Configuration (G-XXXX) — consent-aware
2. GA4 events: `view_service` (page path matches `/services/` or `/rental-turnovers`), `form_start`, `generate_lead`, `property_intake_completed`, `estimator_used`
3. Google Ads Conversion — `generate_lead` with Enhanced Conversions (user-provided data) and transaction_id = `event_id`
4. Google Ads Remarketing (consent-gated)
5. Meta Pixel base + `Lead` event with `eventID = {{DLV event_id}}` (dedups with CAPI)
6. Call tracking script (CallRail/GHL dynamic number insertion) — swap number by source

## Event map
| Event | Browser | Server | Destination |
|---|---|---|---|
| page_view | GA4 auto | — | GA4 |
| view_service | GTM rule | — | GA4 |
| form_start | dataLayer | — | GA4 |
| generate_lead | dataLayer | CAPI `Lead` | GA4, Google Ads, Meta |
| property_intake_completed | dataLayer | — | GA4 |
| site_walk_booked | — | crm-webhook | Meta CAPI `Schedule`, GA4 MP, Google Ads offline |
| qualified_lead | — | crm-webhook | Meta CAPI, GA4 MP, Google Ads offline |
| proposal_sent | — | crm-webhook | Meta CAPI, GA4 MP |
| contract_signed | — | crm-webhook | Meta CAPI, GA4 MP, Google Ads offline (value) |
| purchase | — | crm-webhook | Meta CAPI `Purchase`, GA4 MP, Google Ads offline (value) |

## Google Ads offline conversion import (won-job import)
GCLID is stored on the GHL contact (`pw_gclid`). Options:
- **A (simplest):** GHL's native Google Ads integration "offline conversions" on stage change, if available on your plan.
- **B:** Scheduled Google Sheets upload: GHL workflow appends `gclid, conversion_name, conversion_time, value, currency` to a sheet → Google Ads scheduled upload daily.
- **C:** Google Ads API `UploadClickConversions` from `/api/crm-webhook` (requires developer token — add later).
Also upload hashed email/phone ("enhanced conversions for leads") so conversions match when GCLID is missing.

## GA4 client id for server events
The form reads the `_ga` cookie into `attribution.ga_client_id`; it is stored on the lead and in GHL (`pw_ga_client_id`). The CRM webhook uses it (or a `gaClientId` in the webhook body) for GA4 Measurement Protocol stage events.

## Call tracking
CallRail (or GHL number pool) with DNI by source: Google Ads, Meta, Organic, Direct. Calls ≥ 60s = conversion. Record calls only with notice per state law (MA and FL are two-party consent states — play a recording notice).

## Qualified lead feedback loop
Coordinator tags each lead in GHL within 2 business days: `qualified` / `junk` / `out-of-area` / `duplicate`. Stage → Qualified fires `qualified_lead` upstream so platforms learn lead quality, not volume.

## QA checklist (staging, before launch)
- [ ] Consent banner: decline → no ads cookies; accept → consent update visible in GTM preview
- [ ] One `generate_lead` per submit; double-click submit → one lead (idempotent `eventId`)
- [ ] Reload /thank-you → no conversion
- [ ] Meta Events Manager → Test Events: browser + server `Lead` with same event ID shows "Deduplicated"
- [ ] Google Ads Tag Assistant: conversion fires with enhanced conversion data
- [ ] GHL contact has gclid/fbclid/UTMs/event_id
- [ ] Move test opp to Qualified/Won → CAPI + GA4 MP events received
- [ ] Call from ad number → logged with source
- [ ] Run `python3 tests/e2e_smoke.py <staging-url>`

## Reporting by dimension
UTMs + GHL fields allow cost per lead / qualified lead / won job by **service** (`pw_trade_needs`), **region** (`pw_market`), **customer type** (`pw_customer_type`) and **property account** (Company). See doc 13.

UTM convention: `utm_source=google|meta|linkedin|email|referral`, `utm_medium=cpc|paid_social|outbound|organic_social`, `utm_campaign={MARKET}_{Funnel}_{Theme}` (e.g., `MA_Turnover_Search`), `utm_content={ad/variant id}`.
