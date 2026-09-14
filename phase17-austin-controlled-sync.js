/* BuildScout Phase 17.3 — controlled Austin production sync.
 * Requires a successful source verification report from this browser session.
 * Batch size is intentionally capped while the first live source is being proven in production.
 */
window.BuildScoutAustinSync = (() => {
  const MAX_BATCH = 100;
  let killSwitch = false;

  function requireVerifiedAudit() {
    const report = window.BuildScoutAustinAudit?.getLastReport?.();
    const verification = report?.manualVerification;
    if (!report || verification?.passed !== true || Number(verification?.completed || 0) < 10) {
      throw new Error("Austin production sync is locked. Run the 50-record audit and pass the 10-record source verification first.");
    }
    return report;
  }

  function setKillSwitch(enabled = true) {
    killSwitch = enabled === true;
    return { killSwitch };
  }

  function status() {
    const report = window.BuildScoutAustinAudit?.getLastReport?.();
    return {
      killSwitch,
      maxBatch: MAX_BATCH,
      verificationPassed: report?.manualVerification?.passed === true,
      verificationCompleted: Number(report?.manualVerification?.completed || 0)
    };
  }

  async function dryRun(limit = MAX_BATCH) {
    if (killSwitch) throw new Error("Austin sync kill switch is ON.");
    requireVerifiedAudit();
    const safeLimit = Math.max(1, Math.min(Number(limit) || MAX_BATCH, MAX_BATCH));
    const prepared = await window.BuildScoutAustinPermits.preview(safeLimit);
    const accepted = prepared?.accepted || [];
    const rejected = prepared?.rejected || [];
    const seen = new Set();
    const duplicates = [];
    accepted.forEach((p) => {
      const key = `${p.source || ""}|${p.permit_number || p.source_id || ""}`;
      if (seen.has(key)) duplicates.push(key);
      else seen.add(key);
    });
    return {
      mode: "dry-run",
      requested: safeLimit,
      eligible: accepted.length,
      rejected: rejected.length,
      duplicates: duplicates.length,
      uniqueEligible: accepted.length - duplicates.length,
      projects: accepted,
      productionWritten: false
    };
  }

  async function run(limit = MAX_BATCH, confirmation = "") {
    if (killSwitch) throw new Error("Austin sync kill switch is ON.");
    requireVerifiedAudit();
    if (confirmation !== "IMPORT VERIFIED AUSTIN") {
      throw new Error('Controlled sync requires confirmation text: "IMPORT VERIFIED AUSTIN".');
    }
    if (!window.BuildScoutBackend?.importProjects) throw new Error("BuildScout backend importer is unavailable.");
    const safeLimit = Math.max(1, Math.min(Number(limit) || MAX_BATCH, MAX_BATCH));
    const prepared = await window.BuildScoutAustinPermits.preview(safeLimit);
    const accepted = prepared?.accepted || [];
    const rejected = prepared?.rejected || [];
    if (!accepted.length) throw new Error("No verified Austin records are eligible for import.");

    const unique = [];
    const seen = new Set();
    accepted.forEach((p) => {
      const key = `${p.source || ""}|${p.permit_number || p.source_id || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });

    const saved = await window.BuildScoutBackend.importProjects(unique);
    const result = {
      mode: "controlled-production",
      requested: safeLimit,
      eligible: accepted.length,
      uniqueEligible: unique.length,
      rejected: rejected.length,
      saved: Array.isArray(saved) ? saved.length : 0,
      completedAt: new Date().toISOString(),
      killSwitch
    };
    window.__buildScoutAustinLastSync = result;
    console.info("BuildScout Austin controlled sync", result);
    return result;
  }

  return { MAX_BATCH, status, setKillSwitch, dryRun, run };
})();
