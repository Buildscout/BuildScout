-- BuildScout Phase 19 — production ingestion hardening
-- Run once in Supabase SQL Editor after merging Phase 19.
-- Safe to re-run.

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('running','success','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_fetched integer not null default 0,
  records_eligible integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_unchanged integer not null default 0,
  records_rejected integer not null default 0,
  duplicate_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

create index if not exists sync_runs_source_started_idx
  on public.sync_runs (source, started_at desc);

create index if not exists projects_source_permit_lookup_idx
  on public.projects (source_name, permit_number);

alter table public.sync_runs enable row level security;

-- Browser roles cannot read or mutate ingestion telemetry directly.
revoke all on table public.sync_runs from anon, authenticated;

-- PostgREST table privileges are separate from RLS. The ingestion API uses
-- SUPABASE_SERVICE_ROLE_KEY, so grant that role the minimum table privileges
-- needed by the server-side sync and status endpoints.
grant select, insert, update on table public.sync_runs to service_role;
grant select, insert, update, delete on table public.projects to service_role;

-- Optional hardening after confirming the server sync/admin workflow:
-- drop policy if exists "temp_austin_insert" on public.projects;
-- drop policy if exists "temp_austin_update" on public.projects;
-- revoke insert, update, delete on table public.projects from authenticated;
