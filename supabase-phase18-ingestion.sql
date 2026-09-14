-- BuildScout Phase 18 — production ingestion telemetry
-- Run once in Supabase SQL Editor before enabling scheduled syncs.

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

-- Sync telemetry is server-managed. The service-role key used by the server-side
-- ingestion endpoint bypasses RLS; browser roles receive no direct write access.
revoke all on table public.sync_runs from anon, authenticated;

-- Optional post-cutover hardening:
-- After the server-side sync endpoint has been tested successfully, remove the
-- temporary browser import policies created during Phase 17 and revoke direct
-- project writes from normal signed-in users if no other admin UI depends on them.
--
-- drop policy if exists "temp_austin_insert" on public.projects;
-- drop policy if exists "temp_austin_update" on public.projects;
-- drop policy if exists "buildscout_owner_insert" on public.projects;
-- drop policy if exists "buildscout_owner_update" on public.projects;
-- revoke insert, update, delete on table public.projects from authenticated;
