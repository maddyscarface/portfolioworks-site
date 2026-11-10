# 15 — 90-Day Launch Plan (Greater Boston first)

Owner decisions are marked **[GATE]**; nothing paid goes live until gates in Days 1–14 are cleared.

## Days 1–14 — Foundations & gates
- **[GATE]** Trademark/domain check; register domain; decide entity (new LLC vs. Metropolitan Heights DBA); MA HIC registration / CSL confirmation; GL + workers' comp; EIN/bank.
- **[GATE]** Replace placeholder price sheet (`src/config/pricing.ts`) with real crew/sub costs + target margin.
- **[GATE]** Confirm founder credential wording (`src/config/site.ts`); set `credentialsByMarket.massachusetts`.
- **[GATE]** Legal review of privacy, terms, proposal templates, MA c.142A clauses.
- Recruit/confirm initial sub network: 2 painting/drywall, 2 flooring, 1 plumber, 1 electrician, 1 tile, 1 cleaner — compliance packets on file.
- Deploy site to Vercel staging; connect Upstash, Turnstile; set ADMIN_PASSWORD.
- GHL sub-account: fields, pipelines, workflows (SMS off until A2P approved), calendars, sending domain.
- Photography: founder portrait + 1–2 properties from own portfolio (before/after if available).

## Days 15–30 — Tracking & soft launch
- GTM + GA4 + Google Ads conversion + Meta Pixel/CAPI connected; full QA checklist (doc 11); run `tests/e2e_smoke.py` against staging.
- Go live on production domain; Search Console + Bing; sitemap submitted; GBP (service-area) if eligible.
- Launch **Google MA Turnovers + Brand + Property Managers** at ~$100/day.
- Start ABM: 100 verified accounts (PM firms + owners ≥ 10 units in served towns); outbound sequences (doc 07) at 25 new accounts/week.
- Personal network: email past contacts/landlord peers — offer pilot units.
- Publish 3 articles: turnover checklist, turnover cost Boston, Sept 1 planning.

## Days 31–60 — Scale what converts
- Add Google **Investor Rehab** and **Trade Services** campaigns; Meta **Landlord Turnover** + **PM** campaigns (Housing SAC) + retargeting.
- First pilot units delivered → completion records → first case studies (with permission).
- Weekly search-term and lead-quality review; tag every lead qualified/junk.
- Offline conversion import live (qualified_lead, contract_signed).
- Publish 4 more articles; FAQ additions from sales calls.
- Review response-time data; decide whether to staff an urgent-turnover review SLA (unlocks Funnel E).

## Days 61–90 — Systems & expansion decision
- Convert successful pilots into MSAs with rate cards; onboard first portal users (real auth + DB per doc 09).
- Move Google bidding to tCPA/value-based where ≥ 30 conversions/month.
- Meta: À la carte + Multi-Property campaigns; creative refresh from real projects.
- Executive dashboard (doc 13) live; first monthly business review.
- **[GATE] Florida decision:** licensing path (state certification vs. qualified partner), insurance, crew capacity in core 5 cities → flip `markets.ts` FL to `launch`, enable paused FL campaigns.
- **[GATE] Maine decision:** evaluate inquiries received; ≤ $15/day test or keep referral-only.
- Prepare Sept 1 (next year) capacity plan starting in Q1.

## 90-day scorecard (fill targets after day 30 baseline)
Leads · qualified leads · site walks · proposals · won jobs · contract value · GM % · pilots started/converted · PM accounts approved · cost per won job · median days intake→rent-ready.
