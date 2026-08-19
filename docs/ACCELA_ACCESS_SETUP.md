# Phase 16.3 — Accela access readiness

BuildScout has confirmed that DallasNow is an Accela Citizen Access deployment and that Accela provides a documented REST API at `https://apis.accela.com`.

## What this phase does
- Adds a server-side status endpoint that reports whether approved Accela credentials are configured, without exposing secrets.
- Adds a safe public agency connectivity probe using Accela's documented agency endpoint.
- Keeps production permit ingestion disabled until Dallas record-search access is verified.

## Environment variables
Configure these only in the server/deployment environment. Do **not** place secrets in browser JavaScript or commit them to GitHub.

- `ACCELA_AGENCY=DALLASTX`
- `ACCELA_ENVIRONMENT=PROD`
- `ACCELA_APP_ID=...` when using registered app credentials
- `ACCELA_APP_SECRET=...` when using registered app credentials
- `ACCELA_ACCESS_TOKEN=...` only when using an authorized server-held token

## Verification sequence
1. Deploy this phase.
2. Call `/api/accela-probe` and confirm the Dallas agency resolves through Accela.
3. Call `/api/accela-status` and confirm credentials are configured server-side.
4. Register/authorize the BuildScout app in Accela if required for Dallas record-search permissions.
5. Verify access to the documented record/search resources for Dallas.
6. Only then build the current-permit fetcher and enable scheduled ingestion.

## Data integrity rule
A successful Accela connection does not make every returned record a BuildScout lead. Records still pass through Phase 16 normalization, deduplication, source verification, freshness checks, and project-quality filters before publication.

## Plans and documents
Accela documents endpoints require appropriate authorization. BuildScout will only expose plans/specs or document links when the source makes them public or BuildScout/customer access is authorized. Restricted files must never be copied into public product inventory without permission.
