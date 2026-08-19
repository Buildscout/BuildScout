# Phase 16.2 integration

The DallasNow adapter is isolated from automatic app startup until an authorized machine-readable source is connected. Once that source exists, load `phase16-2-integration.js` from `index.html` and call `BuildScoutLoadDallasNow()` as part of the production data startup path.

This separation is intentional: BuildScout must never imply that portal-derived or manually invented records are verified current Dallas projects.
