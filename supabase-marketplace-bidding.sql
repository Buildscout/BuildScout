-- BuildScout Marketplace & Trade Bidding Foundation
-- Additive migration. Run once in Supabase SQL Editor.
-- Design: public/official projects remain discoverable; user-uploaded plans and
-- private bids are protected by project membership. No document is made public
-- merely because it was uploaded.

alter table public.project_documents
  add column if not exists uploader_user_id uuid references auth.users(id) on delete set null,
  add column if not exists access_scope text not null default 'private'
    check (access_scope in ('public','members','bidders','private'));

-- Existing source-backed public documents retain their public behavior.
update public.project_documents
set access_scope='public'
where is_public=true and uploader_user_id is null;

create table if not exists public.project_workspaces (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public','members','private')),
  posting_status text not null default 'draft' check (posting_status in ('draft','open','closed','awarded','archived')),
  bid_due_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_workspace_members (
  project_id uuid not null references public.project_workspaces(project_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'viewer'
    check (member_role in ('owner','manager','bidder','viewer')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);

create table if not exists public.project_bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_workspaces(project_id) on delete cascade,
  bidder_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  trade text,
  status text not null default 'draft'
    check (status in ('draft','submitted','shortlisted','awarded','rejected','withdrawn')),
  bid_amount numeric,
  proposal_text text,
  document_count integer not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_bid_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_workspaces(project_id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete cascade,
  invited_company_id uuid references public.companies(id) on delete cascade,
  trade text,
  status text not null default 'invited'
    check (status in ('invited','viewed','declined','accepted','submitted')),
  created_at timestamptz not null default now(),
  unique(project_id,invited_user_id,invited_company_id,trade)
);

create index if not exists project_workspaces_status_idx on public.project_workspaces(posting_status,bid_due_at);
create index if not exists project_workspace_members_user_idx on public.project_workspace_members(user_id);
create index if not exists project_bids_project_idx on public.project_bids(project_id,status,created_at desc);
create index if not exists project_bids_bidder_idx on public.project_bids(bidder_user_id,created_at desc);
create index if not exists project_bid_invites_user_idx on public.project_bid_invites(invited_user_id,status);

alter table public.project_documents enable row level security;
alter table public.project_workspaces enable row level security;
alter table public.project_workspace_members enable row level security;
alter table public.project_bids enable row level security;
alter table public.project_bid_invites enable row level security;

grant select,insert,update,delete on public.project_documents to authenticated;
grant select,insert,update,delete on public.project_workspaces,public.project_workspace_members,public.project_bids,public.project_bid_invites to authenticated;
grant select,insert,update,delete on public.project_documents,public.project_workspaces,public.project_workspace_members,public.project_bids,public.project_bid_invites to service_role;

drop policy if exists "BuildScout document access" on public.project_documents;
create policy "BuildScout document access" on public.project_documents
for select to authenticated
using (
  access_scope='public'
  or uploader_user_id=auth.uid()
  or exists (
    select 1 from public.project_workspace_members m
    where m.project_id=project_documents.project_id
      and m.user_id=auth.uid()
  )
  or (
    access_scope='bidders'
    and exists (
      select 1 from public.project_bids b
      where b.project_id=project_documents.project_id
        and b.bidder_user_id=auth.uid()
        and b.status in ('draft','submitted','shortlisted','awarded')
    )
  )
);

drop policy if exists "Users upload project documents" on public.project_documents;
create policy "Users upload project documents" on public.project_documents
for insert to authenticated
with check (uploader_user_id=auth.uid());

drop policy if exists "Users update their project documents" on public.project_documents;
create policy "Users update their project documents" on public.project_documents
for update to authenticated
using (uploader_user_id=auth.uid())
with check (uploader_user_id=auth.uid());

drop policy if exists "Users delete their project documents" on public.project_documents;
create policy "Users delete their project documents" on public.project_documents
for delete to authenticated
using (uploader_user_id=auth.uid());

drop policy if exists "Marketplace projects readable" on public.project_workspaces;
create policy "Marketplace projects readable" on public.project_workspaces
for select to authenticated
using (
  visibility='public'
  or owner_user_id=auth.uid()
  or exists(select 1 from public.project_workspace_members m where m.project_id=project_workspaces.project_id and m.user_id=auth.uid())
);

drop policy if exists "Users create marketplace projects" on public.project_workspaces;
create policy "Users create marketplace projects" on public.project_workspaces
for insert to authenticated
with check (owner_user_id=auth.uid());

drop policy if exists "Owners manage marketplace projects" on public.project_workspaces;
create policy "Owners manage marketplace projects" on public.project_workspaces
for update to authenticated
using (owner_user_id=auth.uid())
with check (owner_user_id=auth.uid());

drop policy if exists "Owners delete marketplace projects" on public.project_workspaces;
create policy "Owners delete marketplace projects" on public.project_workspaces
for delete to authenticated
using (owner_user_id=auth.uid());

drop policy if exists "Members see membership" on public.project_workspace_members;
create policy "Members see membership" on public.project_workspace_members
for select to authenticated
using (
  user_id=auth.uid()
  or exists(select 1 from public.project_workspaces w where w.project_id=project_workspace_members.project_id and w.owner_user_id=auth.uid())
);

drop policy if exists "Owners manage membership" on public.project_workspace_members;
create policy "Owners manage membership" on public.project_workspace_members
for all to authenticated
using (exists(select 1 from public.project_workspaces w where w.project_id=project_workspace_members.project_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.project_workspaces w where w.project_id=project_workspace_members.project_id and w.owner_user_id=auth.uid()));

drop policy if exists "Bid access" on public.project_bids;
create policy "Bid access" on public.project_bids
for select to authenticated
using (
  bidder_user_id=auth.uid()
  or exists(select 1 from public.project_workspaces w where w.project_id=project_bids.project_id and w.owner_user_id=auth.uid())
  or exists(select 1 from public.project_workspace_members m where m.project_id=project_bids.project_id and m.user_id=auth.uid() and m.member_role in ('owner','manager'))
);

drop policy if exists "Users submit their bids" on public.project_bids;
create policy "Users submit their bids" on public.project_bids
for insert to authenticated
with check (
  bidder_user_id=auth.uid()
  and exists(select 1 from public.project_workspaces w where w.project_id=project_bids.project_id and w.posting_status='open')
);

drop policy if exists "Bidders update their bids" on public.project_bids;
create policy "Bidders update their bids" on public.project_bids
for update to authenticated
using (bidder_user_id=auth.uid())
with check (bidder_user_id=auth.uid());

drop policy if exists "Bid invites access" on public.project_bid_invites;
create policy "Bid invites access" on public.project_bid_invites
for select to authenticated
using (
  invited_user_id=auth.uid()
  or exists(select 1 from public.project_workspaces w where w.project_id=project_bid_invites.project_id and w.owner_user_id=auth.uid())
);

drop policy if exists "Owners manage bid invites" on public.project_bid_invites;
create policy "Owners manage bid invites" on public.project_bid_invites
for all to authenticated
using (exists(select 1 from public.project_workspaces w where w.project_id=project_bid_invites.project_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.project_workspaces w where w.project_id=project_bid_invites.project_id and w.owner_user_id=auth.uid()));

-- Storage hardening: existing public project documents should remain public only
-- when metadata says access_scope=public. User uploads should not be globally readable.
drop policy if exists "Authenticated users can view project documents" on storage.objects;
create policy "BuildScout project document access" on storage.objects
for select to authenticated
using (
  bucket_id='project-documents'
  and (
    exists(
      select 1 from public.project_documents d
      where d.file_url=storage.objects.name
        and (
          d.access_scope='public'
          or d.uploader_user_id=auth.uid()
          or exists(select 1 from public.project_workspace_members m where m.project_id=d.project_id and m.user_id=auth.uid())
          or (d.access_scope='bidders' and exists(select 1 from public.project_bids b where b.project_id=d.project_id and b.bidder_user_id=auth.uid() and b.status in ('draft','submitted','shortlisted','awarded')))
        )
    )
  )
);

drop policy if exists "Authenticated users can upload project documents" on storage.objects;
create policy "Authenticated users can upload project documents" on storage.objects
for insert to authenticated
with check (
  bucket_id='project-documents'
  and exists(
    select 1 from public.project_workspaces w
    where w.project_id=((storage.foldername(name))[1])::uuid
      and (w.owner_user_id=auth.uid() or exists(select 1 from public.project_workspace_members m where m.project_id=w.project_id and m.user_id=auth.uid() and m.member_role in ('owner','manager','bidder')))
  )
);
