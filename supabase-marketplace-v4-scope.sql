-- BuildScout V4: AI Scope & Bid Package Foundation
-- Run once in Supabase SQL Editor.

create table if not exists public.project_scope_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  csi_division text,
  trade text not null,
  description text,
  source_document_ids uuid[] not null default '{}',
  ai_status text not null default 'draft'
    check (ai_status in ('draft','analyzing','ready','needs_review','approved')),
  ai_confidence numeric
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  scope_included text,
  exclusions text,
  quantity_summary text,
  notes text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_scope_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.project_scope_packages(id) on delete cascade,
  item_type text not null default 'requirement'
    check (item_type in ('requirement','material','quantity','detail','specification','exclusion','question')),
  title text not null,
  detail text,
  source_document_id uuid,
  source_page text,
  ai_confidence numeric
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  created_at timestamptz not null default now()
);

create index if not exists project_scope_packages_project_idx
  on public.project_scope_packages(project_id, sort_order);

create index if not exists project_scope_items_package_idx
  on public.project_scope_items(package_id);

alter table public.project_scope_packages enable row level security;
alter table public.project_scope_items enable row level security;

grant select,insert,update,delete on public.project_scope_packages, public.project_scope_items to authenticated;
grant select,insert,update,delete on public.project_scope_packages, public.project_scope_items to service_role;

drop policy if exists "Scope packages access" on public.project_scope_packages;
create policy "Scope packages access" on public.project_scope_packages
for select to authenticated
using (
  exists (
    select 1 from public.project_workspaces w
    where w.project_id=project_scope_packages.project_id
      and (
        w.owner_user_id=auth.uid()
        or exists (
          select 1 from public.project_workspace_members m
          where m.project_id=w.project_id and m.user_id=auth.uid()
        )
      )
  )
);

drop policy if exists "Scope packages create" on public.project_scope_packages;
create policy "Scope packages create" on public.project_scope_packages
for insert to authenticated
with check (
  created_by=auth.uid()
  and exists (
    select 1 from public.project_workspaces w
    where w.project_id=project_scope_packages.project_id
      and (w.owner_user_id=auth.uid()
        or exists (
          select 1 from public.project_workspace_members m
          where m.project_id=w.project_id and m.user_id=auth.uid()
            and m.member_role in ('owner','manager')
        ))
  )
);

drop policy if exists "Scope packages manage" on public.project_scope_packages;
create policy "Scope packages manage" on public.project_scope_packages
for update to authenticated
using (
  exists (
    select 1 from public.project_workspaces w
    where w.project_id=project_scope_packages.project_id and w.owner_user_id=auth.uid()
  )
)
with check (
  exists (
    select 1 from public.project_workspaces w
    where w.project_id=project_scope_packages.project_id and w.owner_user_id=auth.uid()
  )
);

drop policy if exists "Scope packages delete" on public.project_scope_packages;
create policy "Scope packages delete" on public.project_scope_packages
for delete to authenticated
using (
  exists (
    select 1 from public.project_workspaces w
    where w.project_id=project_scope_packages.project_id and w.owner_user_id=auth.uid()
  )
);

drop policy if exists "Scope items access" on public.project_scope_items;
create policy "Scope items access" on public.project_scope_items
for select to authenticated
using (
  exists (
    select 1
    from public.project_scope_packages p
    join public.project_workspaces w on w.project_id=p.project_id
    where p.id=project_scope_items.package_id
      and (
        w.owner_user_id=auth.uid()
        or exists (
          select 1 from public.project_workspace_members m
          where m.project_id=w.project_id and m.user_id=auth.uid()
        )
      )
  )
);

drop policy if exists "Scope items create" on public.project_scope_items;
create policy "Scope items create" on public.project_scope_items
for insert to authenticated
with check (
  exists (
    select 1
    from public.project_scope_packages p
    join public.project_workspaces w on w.project_id=p.project_id
    where p.id=project_scope_items.package_id
      and (
        w.owner_user_id=auth.uid()
        or exists (
          select 1 from public.project_workspace_members m
          where m.project_id=w.project_id and m.user_id=auth.uid()
            and m.member_role in ('owner','manager')
        )
      )
  )
);

drop policy if exists "Scope items manage" on public.project_scope_items;
create policy "Scope items manage" on public.project_scope_items
for update to authenticated
using (
  exists (
    select 1 from public.project_scope_packages p
    join public.project_workspaces w on w.project_id=p.project_id
    where p.id=project_scope_items.package_id and w.owner_user_id=auth.uid()
  )
)
with check (
  exists (
    select 1 from public.project_scope_packages p
    join public.project_workspaces w on w.project_id=p.project_id
    where p.id=project_scope_items.package_id and w.owner_user_id=auth.uid()
  )
);

drop policy if exists "Scope items delete" on public.project_scope_items;
create policy "Scope items delete" on public.project_scope_items
for delete to authenticated
using (
  exists (
    select 1 from public.project_scope_packages p
    join public.project_workspaces w on w.project_id=p.project_id
    where p.id=project_scope_items.package_id and w.owner_user_id=auth.uid()
  )
);
