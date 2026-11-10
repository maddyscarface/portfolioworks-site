# 09 — Client/Property Portal, Field Operations & Project Management

## What's built
- `/portal` — client view (prototype, demo data): account summary, approvals queue (proposals + change orders), projects with stage/progress/punch/photos/contract value, properties by owner entity (pre-1978 flag), invoices. Demo account switcher proves scoping.
- `/admin` — operations dashboard (prototype): contract value, forecast cost, GM $/%, approved CO value, pipeline by stage, project table (contract type, PM, subs, due, estimate, contract+CO, cost to date, forecast, GM %, flags: due soon, low margin, CO pending, punch open), subcontractor performance (on-time, callbacks, COI expiry warnings), integration status, **live** website leads.
- `src/lib/portal-data.ts` — typed model + access-scoped query functions; unit test confirms an account only sees its own properties/projects.
- `docs/db/schema.sql` — production Postgres schema with row-level security.

## Production stack (recommended)
- **DB/Auth/Storage:** Supabase (Postgres + RLS + Auth magic links + Storage for photos) — or Neon + Clerk + S3.
- **Photos:** Storage bucket per account, path `{account_id}/{project_id}/{phase}/{uuid}.jpg`; signed URLs only; EXIF GPS stripped for public galleries.
- **E-signature:** GHL Documents & Contracts (already in stack) for proposals and change orders; store signed PDF link on the project.
- **Accounting:** QuickBooks Online sync for invoices/payments (GHL or direct).
- **Field app:** mobile-friendly `/field` routes (next phase) or Companycam for photos with webhook into the project record.

## Roles & permissions
| Role | Sees | Can |
|---|---|---|
| Client admin (PM/owner) | All properties for their account | Add properties/units, request scopes, approve within threshold, invite users |
| Client user | Assigned properties only | Request scopes, upload photos, view status; approve only within personal threshold |
| Owner (of a PM-managed property) | Own owner-entity properties | Approve over-threshold items, view invoices for own entity |
| Coordinator (PW) | Assigned projects | Update stages, upload photos, create COs, punch lists |
| Admin (PW) | Everything | Assign PMs/subs, margins, rate cards |
| Subcontractor (later) | Work orders assigned to them | Upload photos, mark tasks; **no pricing visibility** |

**Enforcement:** account_id comes from the authenticated session → Postgres RLS policies (see schema). Never trust account IDs from URL or body. Every list query is scoped server-side; admin routes behind auth + role check.

## Field operations workflow
1. **Request** (portal/form/email) → project `requested`.
2. **Scope generation:** coordinator walks or reviews photos; selects line items from the market price sheet (same keys as `src/config/pricing.ts`); allowances & exclusions; generates estimate PDF.
3. **Estimate → Proposal** (e-signature).
4. **Work order(s):** one per trade, with scope lines, access info, materials list, sequence position, due date.
5. **Crew/sub assignment:** only subs with valid COI + license (where required) for that market can be selected.
6. **Site access & tenant notices:** access method, contact, notice sent (date/time), notice text stored. Notice periods follow lease/state rules—PM confirms.
7. **Milestones:** start, rough-in (if any), inspections, finish, punch walk, complete.
8. **Change orders:** see rules below.
9. **Inspections:** permit #, inspection type, date, result, photo of sign-off.
10. **Punch list:** items with photo + responsible party; project can't move to Complete until all closed or client-waived.
11. **Payment tracking:** deposit / milestone / final per agreement; aging.

## Agreement types
| | Fixed price | Time & materials | Cost-plus with GMP |
|---|---|---|---|
| Use | Definable scopes | Diagnostic / small unknowns | Complex rehabs |
| Price basis | Line items from price sheet | Labor rate × hours + materials × (1+markup) | Actual cost + disclosed fee, capped at GMP |
| Client sees | Line items | Daily logs, receipts | Open book: all costs, sub invoices |
| Risk | Contractor | Client (capped by NTE) | Shared to GMP |
| Change control | CO for any scope change | CO when NTE would be exceeded | CO adjusts GMP |

## Change-order approval rules
1. Any work outside the approved scope requires a written CO **before** work, except emergency make-safe (stop water, secure hazard) — documented with photos and approved after within 24h.
2. CO content: description, reason (hidden condition / client request / code requirement), photos, price, schedule impact, approver.
3. Thresholds per account: client user ≤ `user_threshold`; client admin ≤ `admin_threshold`; above → owner entity approval.
4. Internally: coordinator may issue COs ≤ $1,000; admin approval above, or if CO pushes GM below 25%.
5. Approved CO automatically updates contract value and invoice schedule.

## State contract requirements (verify with counsel)
- **MA:** home improvement contracts on 1–4 unit owner-occupied residences must meet M.G.L. c.142A content requirements (HIC registration number, start/completion dates, payment schedule, deposit limits, cancellation rights).
- **ME:** Home Construction Contracts Act — written contract with required terms for residential jobs > $3,000.
- **FL:** contractor license number on contracts/ads; Florida Homeowners' Construction Recovery Fund notice for applicable residential contracts; lien law notices.
Templates in doc 10 include placeholders for these clauses; have them reviewed per state.
