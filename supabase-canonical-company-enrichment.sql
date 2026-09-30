-- BuildScout Phase 34 — canonical company enrichment queue
-- Run once after merging. Safe to re-run.

create table if not exists public.canonical_company_enrichment_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','researching','complete','no_match','failed')),
  priority integer not null default 50 check (priority between 0 and 100),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

create index if not exists canonical_company_enrichment_queue_status_idx
  on public.canonical_company_enrichment_queue(status,priority desc,next_attempt_at);

alter table public.canonical_company_enrichment_queue enable row level security;
grant select on public.canonical_company_enrichment_queue to authenticated;
grant select,insert,update,delete on public.canonical_company_enrichment_queue to service_role;
drop policy if exists "Authenticated users read canonical enrichment queue" on public.canonical_company_enrichment_queue;
create policy "Authenticated users read canonical enrichment queue"
  on public.canonical_company_enrichment_queue for select to authenticated using (true);

insert into public.canonical_company_enrichment_queue(company_id,priority)
select c.id,
  case
    when exists(select 1 from public.project_companies pc where pc.company_id=c.id and pc.role='General Contractor') then 90
    when exists(select 1 from public.project_companies pc where pc.company_id=c.id and pc.role='Developer / Owner') then 80
    else 60
  end
from public.companies c
where c.normalized_name is not null
and nullif(trim(coalesce(c.website,'')),'') is null
and nullif(trim(coalesce(c.phone,'')),'') is null
on conflict(company_id) do nothing;
