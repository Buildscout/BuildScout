-- BuildScout Phase 24 — canonical project intelligence foundation
-- Run once in Supabase SQL Editor after merging PR #60. Safe to re-run.

create table if not exists public.project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_name text not null,
  source_type text not null check (source_type in ('official_public_record','licensed_provider','authorized_document','user_supplied')),
  source_record_id text,
  source_url text,
  observed_at timestamptz,
  verified_at timestamptz,
  confidence text not null default 'source-backed' check (confidence in ('verified','source-backed','inferred','unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, source_name, source_record_id)
);

create table if not exists public.project_companies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_name text not null,
  role text not null,
  website text,
  phone text,
  source_id uuid references public.project_sources(id) on delete set null,
  confidence text not null default 'source-backed' check (confidence in ('verified','source-backed','inferred','unknown')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id, company_name, role)
);

create table if not exists public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid references public.project_companies(id) on delete cascade,
  full_name text not null,
  title text,
  email text,
  phone text,
  source_id uuid references public.project_sources(id) on delete set null,
  confidence text not null default 'source-backed' check (confidence in ('verified','source-backed','inferred','unknown')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_sources_project_idx on public.project_sources(project_id);
create index if not exists project_companies_project_idx on public.project_companies(project_id);
create index if not exists project_contacts_project_idx on public.project_contacts(project_id);
create index if not exists project_contacts_company_idx on public.project_contacts(company_id);

alter table public.project_sources enable row level security;
alter table public.project_companies enable row level security;
alter table public.project_contacts enable row level security;

grant select on public.project_sources, public.project_companies, public.project_contacts to authenticated;
grant select, insert, update, delete on public.project_sources, public.project_companies, public.project_contacts to service_role;

drop policy if exists "Authenticated users read project sources" on public.project_sources;
create policy "Authenticated users read project sources" on public.project_sources for select to authenticated using (true);
drop policy if exists "Authenticated users read project companies" on public.project_companies;
create policy "Authenticated users read project companies" on public.project_companies for select to authenticated using (true);
drop policy if exists "Authenticated users read project contacts" on public.project_contacts;
create policy "Authenticated users read project contacts" on public.project_contacts for select to authenticated using (true);

-- Backfill current project provenance without inventing new facts.
insert into public.project_sources(project_id,source_name,source_type,source_record_id,source_url,verified_at,confidence)
select id, source_name, 'official_public_record', permit_number, source_url,
       case when last_verified is null then null else last_verified::timestamptz end,
       case when source_url is not null and source_name is not null then 'source-backed' else 'unknown' end
from public.projects
where source_name is not null
on conflict(project_id,source_name,source_record_id) do update set
  source_url=excluded.source_url,
  verified_at=excluded.verified_at,
  confidence=excluded.confidence;

-- Backfill only company names already stored on projects.
insert into public.project_companies(project_id,company_name,role,confidence,verified_at)
select id,general_contractor,'General Contractor','source-backed',
       case when last_verified is null then null else last_verified::timestamptz end
from public.projects where nullif(trim(general_contractor),'') is not null and lower(trim(general_contractor)) <> 'unknown'
on conflict(project_id,company_name,role) do nothing;

insert into public.project_companies(project_id,company_name,role,confidence,verified_at)
select id,developer,'Developer / Owner','source-backed',
       case when last_verified is null then null else last_verified::timestamptz end
from public.projects where nullif(trim(developer),'') is not null and lower(trim(developer)) <> 'unknown'
on conflict(project_id,company_name,role) do nothing;
