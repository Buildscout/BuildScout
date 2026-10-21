-- BuildScout: repair saved-project RLS
-- Users may only read/write their own saved_projects rows.

alter table public.saved_projects enable row level security;

drop policy if exists "saved_projects_select_own" on public.saved_projects;
drop policy if exists "saved_projects_insert_own" on public.saved_projects;
drop policy if exists "saved_projects_update_own" on public.saved_projects;
drop policy if exists "saved_projects_delete_own" on public.saved_projects;

create policy "saved_projects_select_own"
on public.saved_projects
for select
to authenticated
using (auth.uid() = user_id);

create policy "saved_projects_insert_own"
on public.saved_projects
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "saved_projects_update_own"
on public.saved_projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "saved_projects_delete_own"
on public.saved_projects
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.saved_projects to authenticated;
