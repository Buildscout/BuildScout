# Phase 16 — Real Project Data Foundation

## Goal
BuildScout should publish real construction opportunities backed by traceable evidence. Demo records are not production inventory.

## Pipeline
`source -> ingest -> normalize -> deduplicate -> verify -> enrich -> score -> publish`

## Production rules
1. Every published project must retain provenance: source name, source URL, source type, source/external ID when available, and fetch timestamp.
2. Unknown values remain unknown. Do not invent owners, contractors, contacts, values, dates, plans, specs, or project stages.
3. Prefer official municipal/county/state/federal records. Licensed providers and authorized user/company sources are supported when their use permits it.
4. Restricted plans/specs are never copied or redistributed unless BuildScout is authorized. A legitimate external link may be stored when permitted.
5. Deduplicate before publishing. Permit number + jurisdiction is the preferred identity; address + city + project name is the fallback.
6. Source-backed facts and inferred/enriched facts must remain distinguishable.
7. Store verification time so stale records can be rechecked.

## U.S. rollout
The architecture is nationwide from day one, but connectors should be activated incrementally. Start with Texas/Dallas using the existing Dallas importer, prove quality, then add jurisdictions in repeatable batches. Coverage is a data-source configuration problem, not a new product build for every city.

## Canada
Canada uses the same normalized project contract. Province/municipality-specific connectors are added after the U.S. pipeline and verification gates are stable.

## Phase 16 acceptance criteria
- Real source records can be normalized without demo-only assumptions.
- Every record has a deterministic dedupe key.
- Unverifiable records are blocked from production publication.
- Provenance survives merges/enrichment.
- Unauthorized restricted documents are blocked.
- A batch audit reports verification status, issues, and duplicates.
- Existing UI/CRM can consume normalized projects without requiring fabricated fields.

## Next implementation steps
1. Wire the Dallas importer through `BuildScoutRealData.normalize()` and `canPublish()`.
2. Add a production/demo data-mode switch and clearly exclude demo inventory in production.
3. Persist provenance and verification metadata in the backend.
4. Add source health/sync metrics to Data Sources.
5. Build the next official U.S. jurisdiction connectors using the same adapter contract.
6. Add automated refresh/staleness checks.
7. Add plans/spec metadata and access-right validation before document publication.
