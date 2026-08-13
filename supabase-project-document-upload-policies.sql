-- BuildScout project document upload policies
-- Run this once in the Supabase SQL Editor.
-- Storage SELECT/INSERT policies for the project-documents bucket may also be managed
-- in the Supabase Storage Policies UI.

-- Allow signed-in BuildScout users to create document metadata rows.
drop policy if exists "Authenticated users can add project documents" on public.project_documents;
create policy "Authenticated users can add project documents"
on public.project_documents
for insert
to authenticated
with check (true);

-- Keep the existing viewer behavior: only rows marked public/authorized are readable.
drop policy if exists "Public project documents are readable" on public.project_documents;
create policy "Public project documents are readable"
on public.project_documents
for select
to authenticated
using (is_public = true);

-- Storage policies, equivalent to the policies configured in the dashboard.
-- These statements are safe to use if you want the setup recorded in SQL as well.
drop policy if exists "Authenticated users can view project documents" on storage.objects;
create policy "Authenticated users can view project documents"
on storage.objects
for select
to authenticated
using (bucket_id = 'project-documents');

drop policy if exists "Authenticated users can upload project documents" on storage.objects;
create policy "Authenticated users can upload project documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-documents');
