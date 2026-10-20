-- BuildScout V3: complete contractor proposal package
-- Run once in Supabase SQL Editor.

alter table public.project_bids add column if not exists scope_included text;
alter table public.project_bids add column if not exists exclusions text;
alter table public.project_bids add column if not exists alternates text;
alter table public.project_bids add column if not exists manufacturer text;
alter table public.project_bids add column if not exists proposed_start_date date;
alter table public.project_bids add column if not exists duration_days integer;
alter table public.project_bids add column if not exists notes text;
alter table public.project_bids add column if not exists updated_at timestamptz default now();

create index if not exists project_bids_project_trade_status_idx on public.project_bids(project_id,trade,status);

-- Private bid proposal files live in the existing project-documents bucket.
-- Files are only readable by the uploader or the owner of the related bid.
drop policy if exists "Bid proposal storage select" on storage.objects;
create policy "Bid proposal storage select" on storage.objects
for select to authenticated
using (
  bucket_id = 'project-documents'
  and (
    owner_id = auth.uid()::text
    or exists (
      select 1
      from public.project_bid_documents d
      join public.project_bids b on b.id=d.bid_id
      join public.project_workspaces w on w.project_id=b.project_id
      where d.file_url = name
        and (d.uploader_user_id=auth.uid() or w.owner_user_id=auth.uid())
    )
  )
);

drop policy if exists "Bid proposal storage insert" on storage.objects;
create policy "Bid proposal storage insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'project-documents'
  and owner_id = auth.uid()::text
);

drop policy if exists "Bid proposal storage delete" on storage.objects;
create policy "Bid proposal storage delete" on storage.objects
for delete to authenticated
using (bucket_id='project-documents' and owner_id=auth.uid()::text);
