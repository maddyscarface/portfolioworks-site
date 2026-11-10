# 06 — Intent-Based Marketing & Property Intelligence (B2B ABM)

**Rule zero:** every record and intent signal is *unverified* until sourced. Store the source and date for every fact on an account. No unauthorized scraping (respect site ToS and robots.txt), no purchased consumer lists, no automated/unsolicited texts. Outreach is email, LinkedIn and phone to business contacts, with opt-out honored.

## Data sources
| Source | What it gives | Use | Compliance notes |
|---|---|---|---|
| Public assessor records (Boston, Cambridge, Somerville, Quincy etc.; FL county property appraisers) | Owner entity, parcel, units, year built, sale date | Identify multi-unit owners & recent acquisitions | Public record; use for business outreach only |
| MA Secretary of the Commonwealth / FL Sunbiz / ME SOS | LLC managers, registered agents | Map owner entity → decision maker | Public |
| Registry of Deeds (MassLandRecords) / county clerks | Recent deeds, mortgages | "Recently acquired" signal | Public |
| Building permit portals (e.g., Boston permits open data) | Renovation permits by address/contractor | Renovation activity; competitor share | Public/open data |
| Planning & zoning filings | Conversions, additions | Upcoming capex | Public |
| Property management company websites | Portfolio size, markets, team | PM account list | Manual review only |
| Apollo (or ZoomInfo/Lusha) | Business emails, titles, phones | Contact enrichment | Licensed B2B data; verify emails; CAN-SPAM |
| DataMoon / AudienceLab | Intent audiences, website visitor identification | Prioritization & retargeting | **VERIFY** each vendor's consent basis and state-law compliance (incl. MA/FL privacy laws) before use; never text from these lists |
| Brokerages & investor meetups | Warm intros | Referrals | Respect RE licensing rules on referral fees |
| CRE news (BisNow, Banker & Tradesman, The Real Deal) | Acquisition announcements | Signal | Read & log manually |

## Signals & weights (Account Fit + Intent score, 0–100)
| Signal | Points | Decay |
|---|---|---|
| Owns/manages ≥ 25 units in served towns | 20 | — |
| Owns/manages 10–24 units | 12 | — |
| Recent multifamily acquisition (≤ 180 days) | 15 | −5 per 90d |
| Renovation permit filed (≤ 12 months) | 10 | −5 per 6mo |
| Pre-1978 stock (turnover complexity) | 5 | — |
| PM company posting for maintenance coordinator/vendor RFP | 15 | 60d |
| Intent-vendor topic surge (e.g., "apartment renovation", "property maintenance vendor") | 10 | 30d |
| Website visit (identified company) | 10 | 30d |
| Estimator/planner use | 15 | 30d |
| Public complaint about current contractor/vendor | 5 | 90d |
| Existing relationship / warm intro | 15 | — |

Tiers: **A ≥ 60** (1:1 personalized), **B 35–59** (1:few by segment), **C < 35** (nurture only).

## 10-step process
1. **Identify target accounts.** Build the list in a GHL Smart List or sheet: PM firms in served towns; owner entities with ≥ 10 units from assessor exports; recent acquirers from deeds.
2. **Verify properties.** For each account, confirm 1–5 properties via assessor/registry. Record source URL + date in the GHL account note. Discard anything unverified.
3. **Identify professional decision-makers.** PMs: Director of Maintenance/Operations, VP Property Management, Regional/Portfolio Manager. Owners: Managing Member, Asset Manager, Acquisitions lead. HOAs: management company PM, board president (via management).
4. **Enrich business contacts.** Apollo → verified business email + direct dial. Use catch-all/verification; skip personal emails and personal cell phones scraped from unknown sources.
5. **Score commercial fit** with the table above; write the score + top two reasons to `pw_abm_score` / `pw_abm_reasons`.
6. **Personalize outreach.** For A-tier, reference a *verified* fact (property, acquisition, permit) — never a guessed one. Use doc 07 sequences.
7. **Record account activity in GHL.** Company record = account; contacts associated; opportunities per property in the Partnership pipeline. Log every touch (email/LinkedIn/call) as activity.
8. **Schedule discovery calls.** Calendar link per market (`GHL_CALENDAR_MA`). 30 minutes. Agenda: portfolio, current vendors, pain, pilot candidate.
9. **Propose a pilot unit.** Written pilot proposal with success criteria (doc 03, Funnel B).
10. **Expand to recurring work.** After pilot: MSA + rate card → approved vendor → quarterly business review → add properties/owners.

## Weekly ABM rhythm (owner + VA)
- Mon: add 25 new verified accounts (A/B tier only).
- Tue–Thu: run sequences; 40 calls/week; LinkedIn connects ≤ 20/day.
- Fri: score refresh, pipeline review, update intent sources.

## Compliance checklist
- CAN-SPAM: physical address in emails, working unsubscribe, honor within 10 business days (target: same day).
- No SMS to anyone who hasn't opted in through our form (TCPA). Cold outreach is call/email/LinkedIn only.
- Calls: scrub against the National DNC registry for any number not clearly a business line; maintain an internal DNC list.
- LinkedIn: manual or LinkedIn-approved tools only; no scraping extensions.
- Keep a source log per account; delete data on request.
