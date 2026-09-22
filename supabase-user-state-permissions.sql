-- BuildScout authenticated user-state permissions
-- Safe to re-run in the Supabase SQL Editor.
--
-- Saved projects and pipeline items are account-specific browser data.
-- Authenticated users need table privileges, while RLS restricts each user
-- to rows whose user_id matches auth.uid().

grant select, insert, update, delete on table public.saved_projects to authenticated;
grant select, insert, update, delete on table public.pipeline_items to authenticated;

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
