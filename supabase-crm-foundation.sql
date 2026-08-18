-- BuildScout construction CRM foundation v1
-- Run once in Supabase SQL Editor before deploying the CRM UI.

alter table public.pipeline_items
  add column if not exists opportunity_value numeric,
  add column if not exists probability integer,
  add column if not exists expected_close_date date,
  add column if not exists next_action text,
  add column if not exists lost_reason text;

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  company_name text,
  first_name text,
  last_name text,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  activity_type text not null check (activity_type in ('note','call','email','meeting','task','stage_change')),
  subject text,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_contacts_user_project_idx on public.crm_contacts(user_id, project_id);
create index if not exists crm_activities_user_project_idx on public.crm_activities(user_id, project_id, created_at desc);
create index if not exists pipeline_items_follow_up_idx on public.pipeline_items(user_id, follow_up_at);

grant select, insert, update, delete on public.crm_contacts to authenticated;
grant select, insert, update, delete on public.crm_activities to authenticated;

alter table public.crm_contacts enable row level security;
alter table public.crm_activities enable row level security;

drop policy if exists "Users manage their CRM contacts" on public.crm_contacts;
create policy "Users manage their CRM contacts"
on public.crm_contacts for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their CRM activities" on public.crm_activities;
create policy "Users manage their CRM activities"
on public.crm_activities for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Keep project-document permissions reproducible as part of the production setup.
grant select, insert on table public.project_documents to authenticated;
