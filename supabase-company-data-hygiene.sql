-- BuildScout Phase 36 — company data hygiene
-- Removes only project-company relationships whose company_name normalizes to no usable identity.
-- Safe to re-run. Does not delete projects or valid canonical companies.

delete from public.project_companies
where public.buildscout_normalize_company_name(company_name) is null;

-- Verification: both counts should be zero.
select
  (select count(*) from public.project_companies
   where public.buildscout_normalize_company_name(company_name) is null) as invalid_company_relationships_remaining,
  (select count(*) from public.project_companies
   where company_id is null) as unlinked_company_relationships_remaining;
