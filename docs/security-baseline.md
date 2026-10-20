# BuildScout Security Baseline

BuildScout handles construction intelligence, customer-uploaded documents, project plans, bids, company information, and potentially confidential commercial information.

## Non-negotiables

1. Never commit secrets to Git.
2. Production Supabase service-role keys stay server-side only.
3. Production writes use authenticated authorization or trusted server routes.
4. Private plans and bids require explicit authorization.
5. Customer-uploaded documents are never made public by default.
6. Every project document has an access scope and uploader/provenance.
7. Bid data is visible only to the bidder and authorized project owner/manager.
8. Admin access uses MFA and least privilege.
9. All critical mutations should be auditable.
10. Backups and recovery must be tested before launch.

## Marketplace trust model

Owner/GC:
- controls its project workspace
- chooses project visibility
- controls invited members
- controls bidder invitations
- receives bids

Trade/bidder:
- sees only projects/documents they are authorized to access
- controls its own draft/submitted bid
- cannot read another bidder's private bid

BuildScout:
- provides the platform and intelligence layer
- does not claim ownership of customer plans, specifications, or bids
- must preserve provenance and access boundaries

## Data-source policy

Prefer official public records, licensed feeds, authorized public documents, and company-published information. Preserve source, source record ID, retrieval time, and confidence. Do not bypass access controls or terms.

## Incident readiness

Before launch, establish:
- credential rotation procedure
- database backup/recovery procedure
- account recovery
- audit logs
- document deletion/retention rules
- security incident response
- dependency/update process
