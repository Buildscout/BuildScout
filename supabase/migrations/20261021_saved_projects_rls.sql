-- BuildScout: repair RLS for account-owned saved projects and pipeline items
-- Run this migration in Supabase SQL Editor.

alter table public.saved_projects enable row level security;
drop policy if exists "saved_projects_select_own" on public.saved_projects;
drop policy if exists "saved_projects_insert_own" on public.saved_projects;
drop policy if exists "saved_projects_update_own" on public.saved_projects;
drop policy if exists "saved_projects_delete_own" on public.saved_projects;

create policy "saved_projects_select_own"
on public.saved_projects for select to authenticated
using (auth.uid() = user_id);

create policy "saved_projects_insert_own"
on public.saved_projects for insert to authenticated
with check (auth.uid() = user_id);

create policy "saved_projects_update_own"
on public.saved_projects for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "saved_projects_delete_own"
on public.saved_projects for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.saved_projects to authenticated;

alter table public.pipeline_items enable row level security;
drop policy if exists "pipeline_items_select_own" on public.pipeline_items;
drop policy if exists "pipeline_items_insert_own" on public.pipeline_items;
drop policy if exists "pipeline_items_update_own" on public.pipeline_items;
drop policy if exists "pipeline_items_delete_own" on public.pipeline_items;

create policy "pipeline_items_select_own"
on public.pipeline_items for select to authenticated
using (auth.uid() = user_id);

create policy "pipeline_items_insert_own"
on public.pipeline_items for insert to authenticated
with check (auth.uid() = user_id);

create policy "pipeline_items_update_own"
on public.pipeline_items for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "pipeline_items_delete_own"
on public.pipeline_items for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.pipeline_items to authenticated;
