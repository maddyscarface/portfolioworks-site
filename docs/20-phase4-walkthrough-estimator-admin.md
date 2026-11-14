# Phase 4: tenant-safe mobile walkthrough, private quotes, admin, DataMoon (flags OFF)

Full detail lives in the Phase 4 handoff (`portfolioworks-phase4-handoff.md`). This page is the in-repo summary.

## What ships
- **Mobile walkthrough** (`/walkthrough/start` → private `/w/<token>`), behind `PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED` (OFF by default; route 404s when off).
  Templates: unit turnover / make-ready, unit rehab, capital improvement, multi-unit batch / recurring program (per-unit room rows).
- **Tenant privacy**: occupancy + 3-point privacy promise are required before any upload (server `privacyGate()` + client mirror);
  occupied units whose resident has not been told get no uploads at all; follow-up links always re-ask occupancy and privacy;
  staff can put any file on **privacy hold** (only owner / manager / legal_reviewer can view held files); media is private
  (signed, short-lived URLs), never used for ads or AI; `/w/*` has no tracking, no header/footer, `no-store`, `no-referrer`, `noindex`.
- **Private manual quotes**: draft from the capture with placeholder lines and BLANK rates; editable; owner-only approve;
  private DOCX/PDF export; never auto-sent ("mark sent externally" only). Price book ships blank.
- **No customer-visible prices**: public estimate config has no ranges; the Unit Turnover Scope Planner shows scope only;
  internal ranges live in `src/config/estimate-internal.ts` (`server-only`). Enforced by tests + `tests/tools/price-scan.mjs`.
- **Admin** (`/admin`): roles owner, manager, marketer, estimator, operator, legal_reviewer, read_only; deny by default;
  search, leads, projects, documents, price book, CRM outbox, suppressions, reports, hash-chained audit, integration health,
  staff & roles, DataMoon (synthetic). Old ops prototype moved to `/admin/operations` (owner / `reports.financial`).
- **DataMoon** adapter + 4 landlord / PM / investor / condo-association recipes (all `draft`, `max_records: 0`, MA only, UNVERIFIED criteria).
- **Native AR / measurement** provider contracts (ARKit, RoomPlan, ARCore, Hover, CubiCasa): disabled, no accuracy claims.

## Persistence
`supabase/migrations/20261114_phase4_core.sql` (additive, `p4_*` tables, RLS on, service role only) + rollback file.
Without Supabase the app uses a clearly flagged local JSON fallback (`P4_DATA_DIR`, `/tmp/.data` on Vercel), which is NOT durable.

## Tests
`npm test` (vitest), `npm run e2e:walkthrough` (start the app with the flag on, `ADMIN_PASSWORD`, `P4_DATA_DIR`, `LEAD_ALLOW_MEMORY_STORE=1`),
`node scripts/lead-e2e.mjs <base>`, `python3 tests/e2e_smoke.py <base>`, `node scripts/responsive-audit.mjs <base>`, `node tests/tools/price-scan.mjs`.
