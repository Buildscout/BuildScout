# Phase 17 — Austin verification gate

This step hardens the Austin permit connector before any production sync is enabled.

## Changes

- Missing permit valuation is represented as `null` / Unknown rather than `$0`.
- Austin unit count also preserves missing values instead of coercing them to zero.
- Production eligibility now requires a successful live fetch verification timestamp.
- The adapter supports exact permit-number lookups against the official City of Austin Socrata endpoint.
- The staging audit can re-query the official source for the first 10 records and compare permit number, address, description, issue date, contractor and valuation.

## Required verification

1. Run `await BuildScoutAustinAudit.run(50)`.
2. Confirm 50 records are accepted with no unexpected duplicates or rejections.
3. Run `await BuildScoutAustinAudit.verifySample(10)`.
4. Review the comparison table. All 10 records must be found and match the official source before production activation.
5. Do not enable production import until this gate passes.

## Production status

Production import remains disabled by the audit layer. A later controlled-sync change will be required after the 10-record verification passes.
