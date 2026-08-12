-- BuildScout project document metadata
-- Run this in the Supabase SQL editor before using the Plans & Specs viewer with live documents.

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  document_type text not null default 'Document',
  file_name text,
  file_url text,
  source_url text,
  sheet_number text,
  discipline text,
  revision text,
  issued_date date,
  is_public boolean not null default false,
  access_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents(project_id);

alter table public.project_documents enable row level security;

-- Customers may read only documents BuildScout has marked as public/authorized.
drop policy if exists "Public project documents are readable" on public.project_documents;
create policy "Public project documents are readable"
on public.project_documents
for select
using (is_public = true);

-- Recommended storage design:
-- 1. Create a Supabase Storage bucket named project-documents.
-- 2. Keep private/licensed plan sets private and return signed URLs from a server-side endpoint.
-- 3. Use file_url only for genuinely public documents or already-authorized URLs.
-- 4. Preserve source_url/access_note so BuildScout can track provenance and permissions.
