# Phase 16 Source Adapter Smoke Test

After deploying the branch preview:

1. Open the BuildScout dashboard and confirm it renders normally.
2. In the browser console run `BuildScoutSourceAdapters.list()` and confirm `dallasnow` is registered.
3. Run `BuildScoutSourceAdapters.validateProvenance({})` and confirm it returns `valid: false` with missing provenance errors.
4. Do not import hand-entered/demo records with `source_verified: true`. That flag is reserved for records received through an approved authoritative ingestion path.
5. Confirm existing CRM/project views still load.

This phase intentionally adds the trust/provenance boundary before connecting the next live municipal data endpoint.
