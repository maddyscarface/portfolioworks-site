# 12 — SEO & Answer Engine Optimization

## Built into the site
- Unique titles/descriptions per page (service pages via `services.ts` `seoTitle`/`seoDescription`; town pages templated with town + state)
- Canonicals on every indexable page; `/lp/*`, `/portal`, `/admin`, `/thank-you` noindex; FL/ME market and town pages noindex until launch
- `sitemap.xml` (launched market + served towns only) and `robots.txt`
- Schema: `GeneralContractor` (site-wide), `Service` (service pages), `FAQPage` (home, services, ICP pages), `Person` (about)
- Internal linking: service → upsell services; ICP pages → full catalog; town pages → services + market hub; footer hubs
- Town pages only for served towns (no doorway pages)

## Topic clusters
| Pillar | Cluster pages / articles |
|---|---|
| Rental turnovers (`/rental-turnovers`) | Turnover checklist; turnover cost Boston; Sept 1 planning; vacancy cost; town pages |
| Property-manager vendor (`/property-managers`, `/portfolio-programs`) | Vendor management; pilot unit; standard packages |
| Investor rehab (`/real-estate-investors`, `/services/full-rehab`) | Value-add scope; fixed vs. cost-plus; change orders |
| Trade services (`/services/*`) | LVP vs hardwood; bath refresh vs remodel; kitchen refacing; lead-safe renovation |
| Markets (`/markets/*`) | WPB turnovers; Boca landlord renovation; Fort Lauderdale checklist; Delray condo; Kennebunk repairs |
| HOA (`/hoa-condos`) | Common-area maintenance plan |

The **20 content briefs** (title, primary/secondary keywords, intent, audience, 40–60-word answer-first opening, outline, internal links, market) live in `src/config/seo-briefs.ts` and render on `/resources`. Publish each as `/resources/{slug}` (MDX) after review; FL/ME articles publish when those markets launch.

## Writing standard (AEO)
1. Open with a direct 40–60-word answer (already drafted in each brief) — this is what answer engines quote.
2. H2s phrased as the questions people ask.
3. One table or checklist per article.
4. Cite primary sources for regulations (EPA RRP, Mass. lead law, c.142A, FL DBPR, Maine HCCA) — link, don't paraphrase law from memory.
5. Author box: Gary Acquah with credentials; "Reviewed" date.
6. End with the relevant tool or CTA.
7. No AI-spun location variants; local articles must contain genuinely local information.

## FAQ library
Site FAQs are in `services.ts`, `audiences.ts` and the homepage. Add new Q&As there (they auto-emit FAQPage schema). Source new questions from: sales calls, GHL conversation logs, Search Console queries, "People also ask."

## Search Console & Bing
1. Verify domain property (DNS TXT) in Google Search Console and Bing Webmaster Tools (import from GSC).
2. Submit `/sitemap.xml`.
3. Monitor: coverage (noindex pages should be "Excluded by noindex"), queries by page, Core Web Vitals.
4. Google Business Profile: **only** with a real staffed address or as a service-area business (hide address) for MA; list served towns as service areas. FL GBP only after launch.

## Review acquisition workflow
GHL workflow #10 (doc 08): survey 2 days after Paid → review link to every respondent (Google policy forbids review gating) → owner call for low scores. Respond to every review within 2 business days. Display only verified reviews on the site, with permission.

## Local case studies
After each completed project: 150–300 words, town, property type, scope, planned vs actual schedule, before/after photos (permissioned). Link from the town page. This is the main thing that will make town pages rank.

## Phase 3 (2026-11-13)

- Canonical origin is `NEXT_PUBLIC_CANONICAL_URL` (falls back to the intended production domain). Vercel staging hosts are never used as canonicals or sitemap hosts.
- Indexing requires `NEXT_PUBLIC_INDEXABLE_SITE=true` on a non-`vercel.app` production host. Staging and preview stay `noindex`, including an `X-Robots-Tag` header.
- Published operational guides live at `/resources/[slug]`. Florida and Maine articles are visible for education, noindexed, and omitted from the sitemap.
- `/rental-renovations` is the rental-rehab landing page; `/home-renovations` remains owner-occupied.
- Optional `public/llms.txt` is a facts index, not a ranking signal. Domain and legal name still require owner confirmation.
