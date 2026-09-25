-- BuildScout Phase 28 — decision-maker enrichment queue
-- Run once in Supabase SQL Editor after merging. Safe to re-run.

create table if not exists public.company_enrichment_queue (
  id uuid primary key default gen_random_uuid(),
  project_company_id uuid not null references public.project_companies(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','researching','complete','no_match','failed')),
  priority integer not null default 50 check (priority between 0 and 100),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_company_id)
);

create index if not exists company_enrichment_queue_status_idx on public.company_enrichment_queue(status,priority desc,next_attempt_at);
alter table public.company_enrichment_queue enable row level security;
grant select on public.company_enrichment_queue to authenticated;
grant select,insert,update,delete on public.company_enrichment_queue to service_role;
drop policy if exists "Authenticated users read enrichment queue" on public.company_enrichment_queue;
create policy "Authenticated users read enrichment queue" on public.company_enrichment_queue for select to authenticated using (true);

-- Queue source-backed companies that do not yet have a verified/source-backed contact.
insert into public.company_enrichment_queue(project_company_id,priority)
select pc.id,
  case when pc.role='General Contractor' then 90 when pc.role='Developer / Owner' then 80 else 60 end
from public.project_companies pc
where pc.confidence in ('verified','source-backed')
and not exists (
  select 1 from public.project_contacts c
  where c.company_id=pc.id and c.confidence in ('verified','source-backed')
)
on conflict(project_company_id) do nothing;
