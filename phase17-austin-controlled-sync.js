/* BuildScout Phase 17.3 — controlled Austin production sync.
 * Requires a successful source verification report from this browser session.
 * First-run batch is capped and every record must pass provenance validation.
 */
window.BuildScoutAustinSync = (() => {
  const MAX_BATCH = 25;
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
    return {
      mode: "dry-run",
      requested: safeLimit,
      eligible: accepted.length,
      rejected: rejected.length,
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
    const saved = await window.BuildScoutBackend.importProjects(accepted);
    const result = {
      mode: "controlled-production",
      requested: safeLimit,
      eligible: accepted.length,
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
