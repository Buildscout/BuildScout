# BuildScout Source Adapters

BuildScout production project data must originate from an identifiable authoritative source. Demo records must never be promoted to production merely because they resemble real permits.

## Required production provenance

Every production-eligible normalized project must contain:

- `source` — human-readable source name
- `source_id` or `permit_number` — upstream record identifier
- `source_url` — upstream record or official portal URL
- `source_jurisdiction` — city/county/state/province represented by the source
- `source_country` — `US` initially; `CA` when Canada launches
- `source_authority` — government or authoritative publishing body
- `source_verified: true` — set only after the adapter received the record from the approved source path
- `production_eligible: true`
- `last_source_check` — verification timestamp supplied by the source or ingestion process

## Trust boundary

Adapters must not infer that a record is verified merely because a user supplied it. Verification is an ingestion property, not a formatting property. Unknown contractor, owner, estimator, contact, plan or specification data stays unknown until supported by a source.

## Adapter contract

Each adapter exposes a stable `id`, metadata describing its authority/jurisdiction, `productionEligible`, and `normalizeRecord(record, index)`.

Register adapters through `window.BuildScoutSourceAdapters.register(adapter)`. The registry validates provenance before records can reach `BuildScoutBackend.importProjects`.

## Rollout

1. Dallas live authoritative source
2. Additional Texas jurisdictions
3. Major US jurisdictions using jurisdiction-specific adapters (Socrata, ArcGIS, Accela, open-data APIs and other official systems)
4. Nationwide source coverage and monitoring
5. Canada adapters using the same provenance contract

Plans/specifications and people/contact intelligence remain separate evidence layers. Their absence must not be replaced with invented data.
