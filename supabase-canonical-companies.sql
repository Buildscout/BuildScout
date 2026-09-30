-- BuildScout Phase 33 — canonical company intelligence
-- Run once in Supabase SQL Editor after merging. Safe to re-run.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  website text,
  phone text,
  provider text,
  provider_record_id text,
  confidence text not null default 'source-backed' check (confidence in ('verified','source-backed','inferred','unknown')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_companies add column if not exists company_id uuid references public.companies(id) on delete set null;
create index if not exists project_companies_company_idx on public.project_companies(company_id);
create unique index if not exists companies_provider_record_idx on public.companies(provider,provider_record_id) where provider_record_id is not null;

alter table public.companies enable row level security;
grant select on public.companies to authenticated;
grant select,insert,update,delete on public.companies to service_role;
drop policy if exists "Authenticated users read companies" on public.companies;
create policy "Authenticated users read companies" on public.companies for select to authenticated using (true);

create or replace function public.buildscout_normalize_company_name(value text)
returns text language sql immutable as $$
  select nullif(trim(regexp_replace(lower(coalesce(value,'')), '[^a-z0-9]+', ' ', 'g')), '');
$$;

insert into public.companies(normalized_name,display_name,confidence,verified_at)
select normalized_name,min(company_name),max(confidence),max(verified_at)
from (
  select public.buildscout_normalize_company_name(company_name) normalized_name,company_name,confidence,verified_at
  from public.project_companies
  where public.buildscout_normalize_company_name(company_name) is not null
) x
group by normalized_name
on conflict(normalized_name) do nothing;

update public.project_companies pc
set company_id=c.id
from public.companies c
where pc.company_id is null
and c.normalized_name=public.buildscout_normalize_company_name(pc.company_name);
