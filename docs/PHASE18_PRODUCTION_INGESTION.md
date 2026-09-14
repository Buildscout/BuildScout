# Phase 18 — Production ingestion engine

BuildScout now has a server-side Austin ingestion path intended to replace browser/DevTools imports for normal production operation.

## Architecture

`/api/sync-austin` is a protected Vercel serverless endpoint. It pages the official City of Austin Issued Construction Permits Socrata dataset (`3syk-w9eu`), normalizes source records, rejects malformed records, deduplicates by permit number inside the incoming batch, compares against existing BuildScout Austin rows, inserts new projects in batches, updates changed source-owned fields, and skips unchanged rows.

The endpoint never requires a browser session and never exposes the Supabase service-role key to client JavaScript.

`/api/sync-status` exposes only safe operational status for the Data Sources screen. It does not return credentials.

## Required Vercel environment variables

Add these in Vercel Project Settings → Environment Variables:

- `SUPABASE_SERVICE_ROLE_KEY` — server-only secret from Supabase. **Never** prefix this with `NEXT_PUBLIC_`.
- `SUPABASE_URL` — optional if `NEXT_PUBLIC_SUPABASE_URL` already exists; the server falls back to the public URL variable.
- `CRON_SECRET` — secret used by Vercel Cron to authorize scheduled requests.
- `BUILDSCOUT_SYNC_SECRET` — optional second bearer token for manual/admin sync calls.

Keep the existing browser-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Database setup

Run `supabase-phase18-ingestion.sql` once in the Supabase SQL Editor.

It creates:

- `public.sync_runs` for durable ingestion telemetry
- an index for source sync history
- an index on `projects(source_name, permit_number)` for fast idempotency lookups

The migration intentionally does **not** disable project RLS and does not grant normal users broad project-write access.

## Scheduled sync

`vercel.json` defines one daily cron:

- path: `/api/sync-austin`
- schedule: `0 10 * * *` (10:00 UTC daily)

Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron routes when `CRON_SECRET` is configured.

The default run processes up to 1,000 most-recent Austin permit rows in deterministic pages of 200. The endpoint supports up to 5,000 rows per invocation with `limit` and `pageSize` parameters.

## Manual sync

Send an authenticated request using either `CRON_SECRET` or `BUILDSCOUT_SYNC_SECRET`:

```bash
curl -H "Authorization: Bearer $BUILDSCOUT_SYNC_SECRET" \
  "https://www.build-scout.site/api/sync-austin?limit=1000&pageSize=200"
```

Expected report fields:

- `fetched`
- `eligible`
- `rejected`
- `duplicates`
- `inserted`
- `updated`
- `unchanged`
- `processed`
- `telemetry`

Repeated runs should create no duplicate projects. Existing Austin rows are matched by authoritative source + permit number. Source-managed project fields can be refreshed, while CRM tables and user-owned pursuit data are not touched.

## Production cutover checklist

1. Merge and deploy Phase 18.
2. Add the server-only Vercel environment variables.
3. Run `supabase-phase18-ingestion.sql`.
4. Redeploy Production so the environment variables are available.
5. Call `/api/sync-austin` manually with `limit=250` first.
6. Confirm the report has no unexpected rejects/errors.
7. Open BuildScout → Data Sources and confirm Austin shows Live with the current project count and sync time.
8. Run a second identical sync and confirm new inserts drop to zero unless new City records appeared.
9. Allow the daily cron to take over.

## Post-cutover RLS hardening

Phase 17 temporarily allowed a specific authenticated account to write Austin projects from the browser. Once the server endpoint has been tested successfully, the optional hardening statements at the bottom of `supabase-phase18-ingestion.sql` can be run to drop those temporary browser-import policies and revoke direct project writes from normal authenticated users.

Do this only after confirming no other admin workflow depends on direct browser writes to `projects`.

## Kill switch / rollback

Fastest stop: remove or rotate `CRON_SECRET`, or remove the cron entry and redeploy. The sync endpoint fails closed when no valid bearer secret is supplied.

If a source issue is suspected, do not delete existing projects automatically. Disable scheduled calls, inspect the latest `sync_runs` record, fix the adapter, and rerun after validation.

## Data-quality rules retained

- Source: City of Austin Development Services
- Dataset: `3syk-w9eu`
- Missing valuation remains `null` / Unknown
- Missing units remain unknown
- No invented contractor, value, unit, or date data
- Stable permit number is required
- Every synced row retains source name, source URL, and last verification date
