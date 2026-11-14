-- PortfolioWorks Phase 4 core schema (ADDITIVE ONLY). Independent of docs/db/schema.sql: every table is prefixed p4_ so nothing collides.
-- Document-style tables: indexed columns (kept in sync with src/lib/p4/db.ts TABLES) + a jsonb `data` column.
-- Every row carries `brand`; child rows reference projects by (brand, project_id) so a row can never point at
-- another brand's project. RLS is enabled with NO anon/authenticated policies: only the server (service role)
-- can read or write. Rollback: 20261114_phase4_core_rollback.sql.
begin;

create table if not exists public.p4_projects (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id text,
  status text,
  service text,
  customer_email_hash text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_projects_lead_id_idx on public.p4_projects (brand, lead_id);
create index if not exists p4_projects_status_idx on public.p4_projects (brand, status);
create index if not exists p4_projects_service_idx on public.p4_projects (brand, service);
create index if not exists p4_projects_customer_email_hash_idx on public.p4_projects (brand, customer_email_hash);
create index if not exists p4_projects_created_idx on public.p4_projects (brand, created_at desc);
alter table public.p4_projects enable row level security;

create table if not exists public.p4_capture_sessions (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  token_hash text,
  status text,
  kind text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_capture_sessions_project_id_idx on public.p4_capture_sessions (brand, project_id);
create index if not exists p4_capture_sessions_token_hash_idx on public.p4_capture_sessions (brand, token_hash);
create index if not exists p4_capture_sessions_status_idx on public.p4_capture_sessions (brand, status);
create index if not exists p4_capture_sessions_kind_idx on public.p4_capture_sessions (brand, kind);
create index if not exists p4_capture_sessions_created_idx on public.p4_capture_sessions (brand, created_at desc);
alter table public.p4_capture_sessions enable row level security;
alter table public.p4_capture_sessions drop constraint if exists p4_capture_sessions_project_fk;
alter table public.p4_capture_sessions add constraint p4_capture_sessions_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_media_assets (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  session_id text,
  status text,
  kind text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_media_assets_project_id_idx on public.p4_media_assets (brand, project_id);
create index if not exists p4_media_assets_session_id_idx on public.p4_media_assets (brand, session_id);
create index if not exists p4_media_assets_status_idx on public.p4_media_assets (brand, status);
create index if not exists p4_media_assets_kind_idx on public.p4_media_assets (brand, kind);
create index if not exists p4_media_assets_created_idx on public.p4_media_assets (brand, created_at desc);
alter table public.p4_media_assets enable row level security;
alter table public.p4_media_assets drop constraint if exists p4_media_assets_project_fk;
alter table public.p4_media_assets add constraint p4_media_assets_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_measurement_revisions (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  session_id text,
  revision integer,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_measurement_revisions_project_id_idx on public.p4_measurement_revisions (brand, project_id);
create index if not exists p4_measurement_revisions_session_id_idx on public.p4_measurement_revisions (brand, session_id);
create index if not exists p4_measurement_revisions_revision_idx on public.p4_measurement_revisions (brand, revision);
create index if not exists p4_measurement_revisions_created_idx on public.p4_measurement_revisions (brand, created_at desc);
alter table public.p4_measurement_revisions enable row level security;
alter table public.p4_measurement_revisions drop constraint if exists p4_measurement_revisions_project_fk;
alter table public.p4_measurement_revisions add constraint p4_measurement_revisions_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_capture_followups (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  session_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_capture_followups_project_id_idx on public.p4_capture_followups (brand, project_id);
create index if not exists p4_capture_followups_session_id_idx on public.p4_capture_followups (brand, session_id);
create index if not exists p4_capture_followups_status_idx on public.p4_capture_followups (brand, status);
create index if not exists p4_capture_followups_created_idx on public.p4_capture_followups (brand, created_at desc);
alter table public.p4_capture_followups enable row level security;
alter table public.p4_capture_followups drop constraint if exists p4_capture_followups_project_fk;
alter table public.p4_capture_followups add constraint p4_capture_followups_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_estimates (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  status text,
  revision integer,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_estimates_project_id_idx on public.p4_estimates (brand, project_id);
create index if not exists p4_estimates_status_idx on public.p4_estimates (brand, status);
create index if not exists p4_estimates_revision_idx on public.p4_estimates (brand, revision);
create index if not exists p4_estimates_created_idx on public.p4_estimates (brand, created_at desc);
alter table public.p4_estimates enable row level security;
alter table public.p4_estimates drop constraint if exists p4_estimates_project_fk;
alter table public.p4_estimates add constraint p4_estimates_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_pricebook_items (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_pricebook_items_category_idx on public.p4_pricebook_items (brand, category);
create index if not exists p4_pricebook_items_status_idx on public.p4_pricebook_items (brand, status);
create index if not exists p4_pricebook_items_created_idx on public.p4_pricebook_items (brand, created_at desc);
alter table public.p4_pricebook_items enable row level security;

create table if not exists public.p4_proposal_exports (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  estimate_id text,
  format text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_proposal_exports_project_id_idx on public.p4_proposal_exports (brand, project_id);
create index if not exists p4_proposal_exports_estimate_id_idx on public.p4_proposal_exports (brand, estimate_id);
create index if not exists p4_proposal_exports_format_idx on public.p4_proposal_exports (brand, format);
create index if not exists p4_proposal_exports_created_idx on public.p4_proposal_exports (brand, created_at desc);
alter table public.p4_proposal_exports enable row level security;
alter table public.p4_proposal_exports drop constraint if exists p4_proposal_exports_project_fk;
alter table public.p4_proposal_exports add constraint p4_proposal_exports_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

create table if not exists public.p4_event_outbox (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text,
  status text,
  idempotency_key text,
  ref_id text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_event_outbox_type_idx on public.p4_event_outbox (brand, type);
create index if not exists p4_event_outbox_status_idx on public.p4_event_outbox (brand, status);
create index if not exists p4_event_outbox_idempotency_key_idx on public.p4_event_outbox (brand, idempotency_key);
create index if not exists p4_event_outbox_ref_id_idx on public.p4_event_outbox (brand, ref_id);
create index if not exists p4_event_outbox_created_idx on public.p4_event_outbox (brand, created_at desc);
alter table public.p4_event_outbox enable row level security;

create table if not exists public.p4_audit_log (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  actor text,
  action text,
  target_type text,
  target_id text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_audit_log_actor_idx on public.p4_audit_log (brand, actor);
create index if not exists p4_audit_log_action_idx on public.p4_audit_log (brand, action);
create index if not exists p4_audit_log_target_type_idx on public.p4_audit_log (brand, target_type);
create index if not exists p4_audit_log_target_id_idx on public.p4_audit_log (brand, target_id);
create index if not exists p4_audit_log_created_idx on public.p4_audit_log (brand, created_at desc);
alter table public.p4_audit_log enable row level security;

create table if not exists public.p4_audience_recipes (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  persona text,
  status text,
  api_family text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_audience_recipes_persona_idx on public.p4_audience_recipes (brand, persona);
create index if not exists p4_audience_recipes_status_idx on public.p4_audience_recipes (brand, status);
create index if not exists p4_audience_recipes_api_family_idx on public.p4_audience_recipes (brand, api_family);
create index if not exists p4_audience_recipes_created_idx on public.p4_audience_recipes (brand, created_at desc);
alter table public.p4_audience_recipes enable row level security;

create table if not exists public.p4_audience_runs (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipe_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_audience_runs_recipe_id_idx on public.p4_audience_runs (brand, recipe_id);
create index if not exists p4_audience_runs_status_idx on public.p4_audience_runs (brand, status);
create index if not exists p4_audience_runs_created_idx on public.p4_audience_runs (brand, created_at desc);
alter table public.p4_audience_runs enable row level security;

create table if not exists public.p4_vendor_exports (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipe_id text,
  feed_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_vendor_exports_recipe_id_idx on public.p4_vendor_exports (brand, recipe_id);
create index if not exists p4_vendor_exports_feed_id_idx on public.p4_vendor_exports (brand, feed_id);
create index if not exists p4_vendor_exports_status_idx on public.p4_vendor_exports (brand, status);
create index if not exists p4_vendor_exports_created_idx on public.p4_vendor_exports (brand, created_at desc);
alter table public.p4_vendor_exports enable row level security;

create table if not exists public.p4_vendor_contacts (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contact_id text,
  email_hash text,
  status text,
  export_id text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_vendor_contacts_contact_id_idx on public.p4_vendor_contacts (brand, contact_id);
create index if not exists p4_vendor_contacts_email_hash_idx on public.p4_vendor_contacts (brand, email_hash);
create index if not exists p4_vendor_contacts_status_idx on public.p4_vendor_contacts (brand, status);
create index if not exists p4_vendor_contacts_export_id_idx on public.p4_vendor_contacts (brand, export_id);
create index if not exists p4_vendor_contacts_created_idx on public.p4_vendor_contacts (brand, created_at desc);
alter table public.p4_vendor_contacts enable row level security;

create table if not exists public.p4_suppressions (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_hash text,
  reason text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_suppressions_email_hash_idx on public.p4_suppressions (brand, email_hash);
create index if not exists p4_suppressions_reason_idx on public.p4_suppressions (brand, reason);
create index if not exists p4_suppressions_created_idx on public.p4_suppressions (brand, created_at desc);
alter table public.p4_suppressions enable row level security;

create table if not exists public.p4_consent_evidence (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_hash text,
  kind text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_consent_evidence_email_hash_idx on public.p4_consent_evidence (brand, email_hash);
create index if not exists p4_consent_evidence_kind_idx on public.p4_consent_evidence (brand, kind);
create index if not exists p4_consent_evidence_created_idx on public.p4_consent_evidence (brand, created_at desc);
alter table public.p4_consent_evidence enable row level security;

create table if not exists public.p4_webhook_events (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_webhook_events_event_id_idx on public.p4_webhook_events (brand, event_id);
create index if not exists p4_webhook_events_status_idx on public.p4_webhook_events (brand, status);
create index if not exists p4_webhook_events_created_idx on public.p4_webhook_events (brand, created_at desc);
alter table public.p4_webhook_events enable row level security;

create table if not exists public.p4_upload_sessions (
  id text not null,
  brand text not null check (brand ~ '^[a-z0-9_-]{2,40}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id text,
  session_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  primary key (id),
  unique (brand, id)
);
create index if not exists p4_upload_sessions_project_id_idx on public.p4_upload_sessions (brand, project_id);
create index if not exists p4_upload_sessions_session_id_idx on public.p4_upload_sessions (brand, session_id);
create index if not exists p4_upload_sessions_status_idx on public.p4_upload_sessions (brand, status);
create index if not exists p4_upload_sessions_created_idx on public.p4_upload_sessions (brand, created_at desc);
alter table public.p4_upload_sessions enable row level security;
alter table public.p4_upload_sessions drop constraint if exists p4_upload_sessions_project_fk;
alter table public.p4_upload_sessions add constraint p4_upload_sessions_project_fk foreign key (brand, project_id) references public.p4_projects (brand, id) on delete restrict;

-- Uniqueness that the app relies on for idempotency / dedupe.
create unique index if not exists p4_capture_sessions_token_uq on public.p4_capture_sessions (token_hash);
create unique index if not exists p4_event_outbox_idem_uq on public.p4_event_outbox (brand, idempotency_key);
create unique index if not exists p4_webhook_events_uq on public.p4_webhook_events (brand, event_id);
create unique index if not exists p4_suppressions_uq on public.p4_suppressions (brand, email_hash);
create unique index if not exists p4_vendor_contacts_uq on public.p4_vendor_contacts (brand, contact_id);

-- Audit log is append-only.
create or replace function public.p4_audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'p4_audit_log is append-only'; end $$;
drop trigger if exists p4_audit_no_update on public.p4_audit_log;
create trigger p4_audit_no_update before update or delete on public.p4_audit_log for each row execute function public.p4_audit_immutable();

-- Private storage buckets (signed URLs only; never public).
insert into storage.buckets (id, name, public) values ('capture-media', 'capture-media', false) on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public) values ('proposal-exports', 'proposal-exports', false) on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public) values ('vendor-imports', 'vendor-imports', false) on conflict (id) do update set public = false;

commit;
