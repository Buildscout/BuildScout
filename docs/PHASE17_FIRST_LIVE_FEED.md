# Phase 17 — First Live Authoritative Feed

## Objective
Move BuildScout from a real-data-ready architecture to its first production ingestion of current, authoritative construction records without ever treating demo, historical, fabricated, or unverified data as live inventory.

## Current Dallas blocker
DallasNow is the current City of Dallas permit system, but automated ingestion remains disabled until BuildScout has a documented public machine-readable feed or authorized API/export access. A failing or guessed Accela agency/API route is not sufficient evidence to enable production ingestion.

## Production activation gate
A source may become `live` only when all of the following are true:

1. The source is operated by an authoritative government agency or an explicitly licensed/authorized provider.
2. BuildScout has a documented machine-readable access method that it is permitted to use.
3. A source record has a stable upstream identifier and traceable source URL.
4. The connector preserves jurisdiction, country, source authority, source ID and verification timestamp.
5. Current records can be distinguished from historical/closed inventory.
6. Unknown values remain unknown; the connector never invents owner, GC, contact, value, stage, plans or specs.
7. Normalized records pass `BuildScoutSourceAdapters.validateProvenance()` before import.
8. Duplicate handling is deterministic before publication.
9. Plans/spec links are stored only when access and redistribution/linking rights allow it.
10. A small audited sample is manually compared with the authoritative source before bulk ingestion is enabled.

## Dallas path
- Keep the historical Dallas OpenData permit dataset blocked from current production inventory.
- Keep `/api/dallasnow` fail-closed until authorized access exists.
- Continue pursuing official DallasNow/Accela API or export access.
- Do not block the nationwide rollout on Dallas if another U.S. jurisdiction exposes a legitimate current public feed first.

## First-live-source selection
The next connector should be the first U.S. jurisdiction that satisfies the activation gate, even if it is not Dallas. Prefer jurisdictions with current permit/application data, stable IDs, address and work description, status/dates, public feed documentation and sustainable access terms.

## Acceptance test for the first feed
Before calling Phase 17 complete:

- ingest at least 25 current authoritative records into a staging/import preview;
- reject every record missing required provenance;
- manually verify a sample of at least 10 records against the source;
- report accepted, rejected and duplicate counts;
- ensure demo records are excluded from production mode;
- ensure every published project exposes its source identity internally;
- confirm no fabricated contacts, plans/specs, project values or contractors are introduced;
- only then enable production import for that adapter.

## Rollout after first successful feed
1. Expand within the first jurisdiction and monitor freshness.
2. Add additional Texas jurisdictions using the same adapter contract.
3. Expand by high-value U.S. metros/states in repeatable batches.
4. Add nationwide source-health and stale-record monitoring.
5. Add Canada only after the U.S. ingestion/verification pipeline is stable.

The product promise is not merely "lots of projects." It is trustworthy, source-backed construction intelligence that a salesperson can act on.