-- BuildScout: restore authenticated read access to public project data
-- Safe to run more than once.

grant select on table public.projects to authenticated;

alter table public.projects enable row level security;

drop policy if exists "Authenticated users read projects" on public.projects;
drop policy if exists "authenticated_read_projects" on public.projects;
drop policy if exists "projects_authenticated_select" on public.projects;

create policy "Authenticated users read projects"
on public.projects
for select
to authenticated
using (true);
