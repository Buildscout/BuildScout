-- BuildScout Project-First Architecture
create table if not exists public.source_registry (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  jurisdiction text,
  authority text,
  source_type text not null check (source_type in ('official_public_record','licensed_provider','authorized_document')),
  endpoint_url text,
  adapter_key text,
  refresh_cadence text,
  production_status text not null default 'planned' check (production_status in ('planned','testing','live','paused')),
  terms_reviewed boolean not null default false,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists source_registry_status_idx on public.source_registry(production_status);
create table if not exists public.project_opportunities (
  project_id uuid primary key references public.projects(id) on delete cascade,
  opportunity_score numeric(6,2),
  score_version text not null default 'v1',
  score_reasons jsonb not null default '[]'::jsonb,
  target_trades jsonb not null default '[]'::jsonb,
  stage text,
  bid_date timestamptz,
  last_activity_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  priority text check (priority in ('low','medium','high','urgent')),
  updated_at timestamptz not null default now()
);
create index if not exists project_opportunities_score_idx on public.project_opportunities(opportunity_score desc);
create index if not exists project_opportunities_stage_idx on public.project_opportunities(stage);
create index if not exists project_opportunities_priority_idx on public.project_opportunities(priority);
alter table public.source_registry enable row level security;
alter table public.project_opportunities enable row level security;
grant select on public.source_registry, public.project_opportunities to authenticated;
grant select, insert, update, delete on public.source_registry, public.project_opportunities to service_role;
drop policy if exists "Authenticated users read source registry" on public.source_registry;
create policy "Authenticated users read source registry" on public.source_registry for select to authenticated using (true);
drop policy if exists "Authenticated users read project opportunities" on public.project_opportunities;
create policy "Authenticated users read project opportunities" on public.project_opportunities for select to authenticated using (true);
insert into public.source_registry
(source_key,source_name,jurisdiction,authority,source_type,adapter_key,refresh_cadence,production_status,terms_reviewed)
values
('chicago-building-permits','City of Chicago — Building Permits','Chicago, IL, USA','City of Chicago','official_public_record','chicago','daily','live',true),
('austin-issued-permits','City of Austin — Issued Construction Permits','Austin, TX, USA','City of Austin','official_public_record','austin','daily','live',true),
('nyc-dob-permits','NYC Department of Buildings — Permit Issuance','New York City, NY, USA','NYC Department of Buildings','official_public_record','nyc','daily','testing',true),
('dallas-building-permits','Dallas construction / permit records','Dallas, TX, USA','City of Dallas','official_public_record','dallas','daily','testing',true)
on conflict (source_key) do update set source_name=excluded.source_name,jurisdiction=excluded.jurisdiction,authority=excluded.authority,adapter_key=excluded.adapter_key,refresh_cadence=excluded.refresh_cadence,updated_at=now();
insert into public.project_opportunities(project_id) select id from public.projects on conflict(project_id) do nothing;
