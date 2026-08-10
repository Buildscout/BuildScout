# BuildScout V2

BuildScout V2 upgrades the original MVP with a real interactive OpenStreetMap/Leaflet map and a permit-data import workflow.

## Major upgrades
- Real street map centered on Dallas–Fort Worth
- 24 clearly labeled demo project pins
- CSV and JSON import for real permit/project records
- Common-column normalization
- Imported data stored in browser localStorage
- Project detail modal with permit/source fields
- Source/verification labels
- Opportunity score calculation for imported records
- Saved projects and sales pipeline
- Data Sources page with official city-source links
- Mobile responsive layout

## Publish
Replace the old repository files with the files in this package. Because Vercel is connected to GitHub, a commit to the main branch should trigger a new deployment automatically.

## Important
The built-in records are demo records. Real records are only treated as imported records after you provide a city/public/licensed export.

## Recommended next backend phase
- Supabase/Postgres for users/projects/companies/contacts
- Server-side scheduled ingestion jobs
- Server-side geocoding for permit exports without coordinates
- Authentication
- Stripe
- Email/SMS alerts
