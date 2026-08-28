# Phase 17 — Austin Staging Audit

The Austin connector is intentionally staged before production import.

The City of Austin Issued Construction Permits data is public government data, updated daily, and includes permit number, location, work description, issue date, valuation, units and other permit details. Austin Development Services warns that the dataset is informational and continuously updated, so BuildScout must preserve provenance and verification timestamps rather than representing the feed as infallible.

## Browser test
After deployment, open BuildScout and run this in the browser console:

```js
await BuildScoutAustinAudit.run(50)
```

This fetches 50 records through the Austin adapter and returns a staging report. It does **not** import projects.

Inspect:
- `counts.fetched`
- `counts.accepted`
- `counts.rejected`
- `counts.duplicates`
- `fieldCoverage`
- `projects`

The first 10 normalized projects are also printed as a console table.

## Manual verification gate
Before broad production import:
1. Use at least 25 accepted records.
2. Compare at least 10 normalized records with the City of Austin source.
3. Confirm permit/source ID, project/address, description and issue date where supplied.
4. Treat contractor, valuation, units and project name as optional; absence must never be filled with invented data.
5. Investigate rejected and duplicate records.
6. Only after the sample passes should a separate PR enable production import/sync.

`BuildScoutAustinAudit` deliberately exposes no production-import method.