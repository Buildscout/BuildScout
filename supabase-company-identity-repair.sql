-- BuildScout Phase 35 — inspect/repair unlinked company relationships
-- Safe to run after Phase 33. No fuzzy matching.

update public.project_companies pc
set company_id=c.id
from public.companies c
where pc.company_id is null
and public.buildscout_normalize_company_name(pc.company_name) is not null
and c.normalized_name=public.buildscout_normalize_company_name(pc.company_name);

-- Read-only verification result returned to the SQL editor.
select pc.id,pc.project_id,pc.company_name,pc.role,pc.confidence
from public.project_companies pc
where pc.company_id is null
order by pc.company_name
limit 100;
