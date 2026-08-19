# Phase 16 Notes

The production probe showed the configured Dallas Accela agency lookup was not ready for ingestion: the application was unconfigured and the `DALLASTX` agency probe returned an upstream 400 response.

BuildScout therefore treats that route as unavailable until an approved authoritative connection is confirmed. The source-adapter layer is designed so Dallas and future jurisdictions can use their actual official publishing system without coupling the product to one vendor.
