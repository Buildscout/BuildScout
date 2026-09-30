-- BuildScout Phase 33 — canonical company intelligence
-- Run once in Supabase SQL Editor after merging. Safe to re-run, including after a partial prior run.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  normalized_name text,
  display_name text,
  website text,
  phone text,
  provider text,
  provider_record_id text,
  confidence text default 'source-backed',
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Repair/upgrade an older or partially-created companies table before indexes/backfill.
alter table public.companies add column if not exists normalized_name text;
alter table public.companies add column if not exists display_name text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists provider text;
alter table public.companies add column if not exists provider_record_id text;
alter table public.companies add column if not exists confidence text default 'source-backed';
alter table public.companies add column if not exists verified_at timestamptz;
alter table public.companies add column if not exists created_at timestamptz default now();
alter table public.companies add column if not exists updated_at timestamptz default now();

alter table public.project_companies add column if not exists company_id uuid references public.companies(id) on delete set null;

create or replace function public.buildscout_normalize_company_name(value text)
returns text language sql immutable as $$
  select nullif(trim(regexp_replace(lower(coalesce(value,'')), '[^a-z0-9]+', ' ', 'g')), '');
$$;

-- Backfill any existing canonical rows that came from an earlier schema.
update public.companies
set normalized_name=public.buildscout_normalize_company_name(display_name)
where normalized_name is null and display_name is not null;

insert into public.companies(normalized_name,display_name,confidence,verified_at)
select normalized_name,min(company_name),max(confidence),max(verified_at)
from (
  select public.buildscout_normalize_company_name(company_name) normalized_name,company_name,confidence,verified_at
  from public.project_companies
  where public.buildscout_normalize_company_name(company_name) is not null
) x
where normalized_name is not null
and not exists (select 1 from public.companies c where c.normalized_name=x.normalized_name)
group by normalized_name;

-- Constraints/indexes come only after all required columns and backfill exist.
create unique index if not exists companies_normalized_name_idx on public.companies(normalized_name) where normalized_name is not null;
create index if not exists project_companies_company_idx on public.project_companies(company_id);
create unique index if not exists companies_provider_record_idx on public.companies(provider,provider_record_id) where provider_record_id is not null;

alter table public.companies enable row level security;
grant select on public.companies to authenticated;
grant select,insert,update,delete on public.companies to service_role;
drop policy if exists "Authenticated users read companies" on public.companies;
create policy "Authenticated users read companies" on public.companies for select to authenticated using (true);

update public.project_companies pc
set company_id=c.id
from public.companies c
where pc.company_id is null
and c.normalized_name=public.buildscout_normalize_company_name(pc.company_name);
