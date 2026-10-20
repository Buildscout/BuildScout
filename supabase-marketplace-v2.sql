-- BuildScout Marketplace V2: trade packages, RFIs, bid documents, and lifecycle
-- Run once in Supabase SQL Editor after supabase-marketplace-bidding.sql.

create table if not exists public.project_trade_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_workspaces(project_id) on delete cascade,
  trade text not null,
  scope_summary text,
  status text not null default 'open' check (status in ('draft','open','closed','awarded')),
  bid_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, trade)
);

create table if not exists public.project_bid_documents (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.project_bids(id) on delete cascade,
  uploader_user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.project_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_workspaces(project_id) on delete cascade,
  asked_by_user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  answered_by_user_id uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_trade_packages_project_idx on public.project_trade_packages(project_id,status,bid_due_at);
create index if not exists project_bid_documents_bid_idx on public.project_bid_documents(bid_id,created_at);
create index if not exists project_questions_project_idx on public.project_questions(project_id,created_at);

alter table public.project_trade_packages enable row level security;
alter table public.project_bid_documents enable row level security;
alter table public.project_questions enable row level security;

grant select,insert,update,delete on public.project_trade_packages,public.project_bid_documents,public.project_questions to authenticated;
grant select,insert,update,delete on public.project_trade_packages,public.project_bid_documents,public.project_questions to service_role;

drop policy if exists "Trade package access" on public.project_trade_packages;
create policy "Trade package access" on public.project_trade_packages
for select to authenticated
using (
  exists(select 1 from public.project_workspaces w where w.project_id=project_trade_packages.project_id and (w.visibility='public' or w.owner_user_id=auth.uid()))
  or exists(select 1 from public.project_workspace_members m where m.project_id=project_trade_packages.project_id and m.user_id=auth.uid())
);

drop policy if exists "Owners manage trade packages" on public.project_trade_packages;
create policy "Owners manage trade packages" on public.project_trade_packages
for all to authenticated
using (exists(select 1 from public.project_workspaces w where w.project_id=project_trade_packages.project_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.project_workspaces w where w.project_id=project_trade_packages.project_id and w.owner_user_id=auth.uid()));

drop policy if exists "Bid document access" on public.project_bid_documents;
create policy "Bid document access" on public.project_bid_documents
for select to authenticated
using (
  uploader_user_id=auth.uid()
  or exists(
    select 1 from public.project_bids b
    where b.id=project_bid_documents.bid_id
      and (
        b.bidder_user_id=auth.uid()
        or exists(select 1 from public.project_workspaces w where w.project_id=b.project_id and w.owner_user_id=auth.uid())
      )
  )
);

drop policy if exists "Bidders add bid documents" on public.project_bid_documents;
create policy "Bidders add bid documents" on public.project_bid_documents
for insert to authenticated
with check (
  uploader_user_id=auth.uid()
  and exists(select 1 from public.project_bids b where b.id=project_bid_documents.bid_id and b.bidder_user_id=auth.uid())
);

drop policy if exists "Bidders manage bid documents" on public.project_bid_documents;
create policy "Bidders manage bid documents" on public.project_bid_documents
for delete to authenticated
using (uploader_user_id=auth.uid());

drop policy if exists "Project question access" on public.project_questions;
create policy "Project question access" on public.project_questions
for select to authenticated
using (
  asked_by_user_id=auth.uid()
  or exists(select 1 from public.project_workspaces w where w.project_id=project_questions.project_id and w.owner_user_id=auth.uid())
  or exists(select 1 from public.project_workspace_members m where m.project_id=project_questions.project_id and m.user_id=auth.uid())
);

drop policy if exists "Authorized users ask questions" on public.project_questions;
create policy "Authorized users ask questions" on public.project_questions
for insert to authenticated
with check (
  asked_by_user_id=auth.uid()
  and exists(
    select 1 from public.project_workspaces w
    where w.project_id=project_questions.project_id
      and (
        w.owner_user_id=auth.uid()
        or w.visibility='public'
        or exists(select 1 from public.project_workspace_members m where m.project_id=w.project_id and m.user_id=auth.uid())
      )
  )
);

drop policy if exists "Owners answer questions" on public.project_questions;
create policy "Owners answer questions" on public.project_questions
for update to authenticated
using (exists(select 1 from public.project_workspaces w where w.project_id=project_questions.project_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.project_workspaces w where w.project_id=project_questions.project_id and w.owner_user_id=auth.uid()));

-- Keep bid amounts and proposals private: owners/managers and the bidder can see them.
-- No public policy is created for project_bids.
