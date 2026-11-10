-- BuildScout: finalize account-state permissions for saved projects and pipeline items.
-- Run this migration in the Supabase SQL Editor.
--
-- The web app writes account state through /api/user-state using the
-- Supabase service-role key. The earlier migration granted access only to
-- authenticated, which left the server-side API with "permission denied".
-- Keep authenticated grants + RLS for direct client access, and explicitly
-- grant the server role used by the API.

grant select, insert, update, delete on table public.saved_projects to authenticated;
grant select, insert, update, delete on table public.saved_projects to service_role;

grant select, insert, update, delete on table public.pipeline_items to authenticated;
grant select, insert, update, delete on table public.pipeline_items to service_role;

alter table public.saved_projects enable row level security;
alter table public.pipeline_items enable row level security;

drop policy if exists "Users manage their saved projects" on public.saved_projects;
create policy "Users manage their saved projects"
on public.saved_projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their pipeline items" on public.pipeline_items;
create policy "Users manage their pipeline items"
on public.pipeline_items
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
