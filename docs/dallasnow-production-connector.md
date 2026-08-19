# DallasNow production connector

BuildScout treats **City of Dallas DallasNow / Accela Citizen Access** as the current official Dallas permitting system.

## Production rule

No DallasNow record may become a production BuildScout opportunity unless it has:

- a real DallasNow permit/record number;
- a project address;
- a project name or work description;
- a current official-source URL;
- source verification and current-source flags.

The browser adapter in `dallasnow-adapter.js` normalizes and validates those records before they can reach `BuildScoutBackend.importProjects()`.

## Connector status

Automated retrieval is deliberately disabled in `api/dallasnow.js` until BuildScout has a documented public or authorized machine-readable DallasNow/Accela source. Do not bypass this boundary with brittle portal scraping or authenticated-session automation.

## Next implementation step

1. Obtain or identify the official DallasNow/Accela API, report/export, or other permitted machine-readable source.
2. Map its fields into the adapter contract.
3. Preserve source record number, source URL, status date, address, description, valuation, contractor, and document metadata when publicly available.
4. Reject incomplete/unverifiable records instead of filling them with demo values.
5. Only after source verification, enable scheduled ingestion and freshness checks.

This is the pattern BuildScout will reuse as additional U.S. jurisdictions are added.
