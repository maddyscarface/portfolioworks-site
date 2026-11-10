-- PortfolioWorks production schema (Postgres / Supabase). Row-level security scopes
-- every customer read to the caller's account. Run in a fresh database.

create extension if not exists "pgcrypto";

create type market_id as enum ('massachusetts','florida','maine');
create type agreement_type as enum ('fixed-price','time-and-materials','cost-plus-gmp');
create type project_stage as enum ('requested','estimating','proposal','approved','scheduled','in-progress','punch-list','complete','invoiced','paid','lost');
create type user_role as enum ('client_admin','client_user','owner','coordinator','admin','subcontractor');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('landlord','portfolio-owner','property-manager','investor','hoa')),
  market market_id not null,
  ghl_company_id text,
  admin_threshold numeric(12,2) default 2500,
  user_threshold numeric(12,2) default 500,
  created_at timestamptz default now()
);

create table owners (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  billing_email text
);

create table app_users (
  id uuid primary key,                        -- = auth.users.id
  account_id uuid references accounts(id),    -- null for PortfolioWorks staff
  owner_id uuid references owners(id),        -- set for 'owner' role
  role user_role not null,
  email text not null,
  approval_threshold numeric(12,2)
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  owner_id uuid references owners(id),
  address text not null, city text not null, state text not null, zip text not null,
  units int not null default 1, year_built int,
  access_notes text,
  created_at timestamptz default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  label text not null, bedrooms int, bathrooms numeric(3,1), sqft int,
  paint_spec jsonb default '{}', flooring_spec jsonb default '{}'
);

create table subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null, trade text not null, markets market_id[] not null,
  license_number text, license_state text, license_expires date,
  coi_expires date, w9_on_file boolean default false,
  active boolean default true
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,                   -- e.g. PW-1041
  property_id uuid not null references properties(id),
  unit_id uuid references units(id),
  title text not null, service text not null,
  stage project_stage not null default 'requested',
  agreement agreement_type not null default 'fixed-price',
  coordinator_id uuid references app_users(id),
  estimate numeric(12,2), contract_value numeric(12,2), gmp numeric(12,2), nte numeric(12,2),
  cost_to_date numeric(12,2) default 0, forecast_cost numeric(12,2),
  start_date date, due_date date, completed_at timestamptz,
  ghl_opportunity_id text, lead_event_id text,
  created_at timestamptz default now()
);

create table scope_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null, description text not null,
  qty numeric(10,2) not null default 1, unit text default 'ea',
  unit_price numeric(12,2) not null, internal_cost numeric(12,2),  -- internal_cost hidden from clients via view
  status text not null default 'proposed' check (status in ('proposed','approved','deferred','removed'))
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  subcontractor_id uuid references subcontractors(id),
  trade text not null, sequence int not null, due_date date,
  status text not null default 'open' check (status in ('open','scheduled','in-progress','done'))
);

create table change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null, reason text not null check (reason in ('hidden-condition','client-request','code-requirement','make-safe')),
  amount numeric(12,2) not null, schedule_days int default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references app_users(id), approved_at timestamptz,
  signed_pdf_url text, created_at timestamptz default now()
);

create table punch_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  text text not null, done boolean default false, photo_path text, waived boolean default false
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  phase text not null check (phase in ('before','progress','after','inspection','change-order')),
  room text, storage_path text not null, taken_at timestamptz default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  permit_number text, kind text, scheduled_for date, result text, photo_path text
);

create table tenant_notices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  sent_at timestamptz, method text, notice_text text, access_window text
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  owner_id uuid references owners(id),
  number text unique not null, amount numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  issued_on date, due_on date, paid_on date, qbo_id text
);

-- ───── Row-level security ─────
alter table properties enable row level security;
alter table projects enable row level security;
alter table scope_lines enable row level security;
alter table change_orders enable row level security;
alter table photos enable row level security;
alter table invoices enable row level security;

create or replace function current_app_user() returns app_users language sql stable as
$$ select * from app_users where id = auth.uid() $$;

create or replace function is_staff() returns boolean language sql stable as
$$ select coalesce((select role in ('coordinator','admin') from app_users where id = auth.uid()), false) $$;

create policy prop_read on properties for select using (
  is_staff() or account_id = (current_app_user()).account_id
  and ((current_app_user()).role <> 'owner' or owner_id = (current_app_user()).owner_id)
);
create policy proj_read on projects for select using (
  is_staff() or exists (select 1 from properties p where p.id = projects.property_id)  -- inherits properties RLS
);
create policy co_read on change_orders for select using (is_staff() or exists (select 1 from projects pr where pr.id = change_orders.project_id));
create policy photo_read on photos for select using (is_staff() or exists (select 1 from projects pr where pr.id = photos.project_id));
create policy inv_read on invoices for select using (is_staff() or exists (select 1 from projects pr where pr.id = invoices.project_id));
create policy scope_read on scope_lines for select using (is_staff() or exists (select 1 from projects pr where pr.id = scope_lines.project_id));

-- Clients read scope lines through this view, which omits internal_cost.
create view client_scope_lines with (security_invoker = true) as
  select id, project_id, category, description, qty, unit, unit_price, status from scope_lines;

-- Approve a change order only within the caller's threshold.
create or replace function approve_change_order(co uuid) returns void language plpgsql security definer as $$
declare u app_users; amt numeric; acct uuid;
begin
  select * into u from app_users where id = auth.uid();
  select c.amount, p.account_id into amt, acct from change_orders c join projects pr on pr.id = c.project_id join properties p on p.id = pr.property_id where c.id = co;
  if u.account_id is distinct from acct and u.role not in ('admin') then raise exception 'forbidden'; end if;
  if amt > coalesce(u.approval_threshold, (select case when u.role = 'client_admin' then admin_threshold else user_threshold end from accounts where id = acct)) and u.role <> 'owner' then
    raise exception 'over threshold — owner approval required';
  end if;
  update change_orders set status = 'approved', approved_by = u.id, approved_at = now() where id = co;
  update projects set contract_value = coalesce(contract_value,0) + amt where id = (select project_id from change_orders where id = co);
end $$;
