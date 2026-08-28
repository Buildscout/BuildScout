/* BuildScout Phase 17 — Austin staging preview + audit.
 * Fetches authoritative City of Austin permit records but NEVER imports them.
 * Production import remains a separate explicit action after audit acceptance.
 */
window.BuildScoutAustinAudit = (() => {
  const DEFAULT_SAMPLE = 50;
  const MANUAL_VERIFY_TARGET = 10;

  const clean = v => String(v == null ? "" : v).trim();

  function dedupeKey(p) {
    return clean(p?.source_id || p?.permit_number || p?.id).toLowerCase();
  }

  function auditPrepared(prepared) {
    const accepted = Array.isArray(prepared?.accepted) ? prepared.accepted : [];
    const rejected = Array.isArray(prepared?.rejected) ? prepared.rejected : [];
    const seen = new Map();
    const duplicates = [];
    const fieldCoverage = {
      address: 0, description: 0, projectName: 0, contractor: 0,
      valuation: 0, units: 0, issuedDate: 0, sourceId: 0
    };

    accepted.forEach((p, index) => {
      const key = dedupeKey(p);
      if (key) {
        if (seen.has(key)) duplicates.push({ key, firstIndex: seen.get(key), duplicateIndex: index });
        else seen.set(key, index);
      }
      if (clean(p.street_address)) fieldCoverage.address++;
      if (clean(p.description)) fieldCoverage.description++;
      if (clean(p.name)) fieldCoverage.projectName++;
      if (clean(p.contractor)) fieldCoverage.contractor++;
      if (p.value != null && Number.isFinite(Number(p.value))) fieldCoverage.valuation++;
      if (p.units != null && Number.isFinite(Number(p.units))) fieldCoverage.units++;
      if (clean(p.issued_date)) fieldCoverage.issuedDate++;
      if (clean(p.source_id)) fieldCoverage.sourceId++;
    });

    const uniqueAccepted = accepted.filter((p, i) => {
      const key = dedupeKey(p);
      return !key || seen.get(key) === i;
    });

    return {
      mode: "staging-only",
      generatedAt: new Date().toISOString(),
      source: prepared?.source || window.BuildScoutAustinPermits?.SOURCE || null,
      counts: {
        fetched: accepted.length + rejected.length,
        accepted: accepted.length,
        rejected: rejected.length,
        duplicates: duplicates.length,
        uniqueAccepted: uniqueAccepted.length
      },
      fieldCoverage,
      duplicates,
      rejected,
      projects: uniqueAccepted,
      manualVerification: {
        required: Math.min(MANUAL_VERIFY_TARGET, uniqueAccepted.length),
        completed: 0,
        passed: false,
        note: "Compare these records with the City of Austin source before enabling production import."
      },
      productionImportEnabled: false
    };
  }

  async function run(limit = DEFAULT_SAMPLE) {
    if (!window.BuildScoutAustinPermits?.preview) throw new Error("Austin permit adapter is unavailable.");
    const safeLimit = Math.max(25, Math.min(Number(limit) || DEFAULT_SAMPLE, 250));
    const prepared = await window.BuildScoutAustinPermits.preview(safeLimit);
    const report = auditPrepared(prepared);
    window.__buildScoutAustinAudit = report;
    console.table(report.projects.slice(0, 10).map(p => ({
      permit: p.permit_number,
      project: p.name,
      address: p.street_address,
      issued: p.issued_date,
      value: p.value == null ? "Unknown" : p.value,
      contractor: p.contractor,
      source: p.source_id
    })));
    console.info("BuildScout Austin staging audit", report);
    return report;
  }

  function normalizedComparable(project) {
    return {
      permit: clean(project?.permit_number),
      address: clean(project?.street_address),
      description: clean(project?.description),
      issued: clean(project?.issued_date),
      contractor: clean(project?.contractor),
      value: project?.value == null ? null : Number(project.value)
    };
  }

  function compareProject(expected, actual) {
    const a = normalizedComparable(expected);
    const b = normalizedComparable(actual);
    const fields = ["permit", "address", "description", "issued", "contractor", "value"];
    const mismatches = fields.filter(field => {
      if (field === "value") return a[field] !== b[field];
      return a[field].toLowerCase() !== b[field].toLowerCase();
    });
    return { match: mismatches.length === 0, mismatches, expected: a, official: b };
  }

  async function verifySample(count = MANUAL_VERIFY_TARGET) {
    const report = getLastReport();
    if (!report?.projects?.length) throw new Error("Run BuildScoutAustinAudit.run(50) first.");
    if (!window.BuildScoutAustinPermits?.fetchByPermitNumber) throw new Error("Austin permit lookup is unavailable.");

    const sampleSize = Math.max(1, Math.min(Number(count) || MANUAL_VERIFY_TARGET, MANUAL_VERIFY_TARGET, report.projects.length));
    const sample = report.projects.slice(0, sampleSize);
    const results = [];

    for (const project of sample) {
      try {
        const rows = await window.BuildScoutAustinPermits.fetchByPermitNumber(project.permit_number);
        if (!rows.length) {
          results.push({ permit: project.permit_number, found: false, match: false, mismatches: ["record-not-found"] });
          continue;
        }
        const official = window.BuildScoutAustinPermits.normalizeRecord(rows[0]);
        const comparison = compareProject(project, official);
        results.push({ permit: project.permit_number, found: true, ...comparison });
      } catch (error) {
        results.push({ permit: project.permit_number, found: false, match: false, mismatches: [error.message] });
      }
    }

    const passedCount = results.filter(r => r.match).length;
    const verification = {
      required: sampleSize,
      completed: results.length,
      passedCount,
      failedCount: results.length - passedCount,
      passed: results.length === sampleSize && passedCount === sampleSize,
      results,
      note: "Review this table against the official City of Austin records before production activation."
    };
    report.manualVerification = verification;
    window.__buildScoutAustinAudit = report;
    console.table(results.map(r => ({
      permit: r.permit,
      found: r.found,
      match: r.match,
      mismatches: Array.isArray(r.mismatches) ? r.mismatches.join(", ") : ""
    })));
    console.info("BuildScout Austin source verification", verification);
    return verification;
  }

  function getLastReport() { return window.__buildScoutAustinAudit || null; }

  return { run, verifySample, auditPrepared, getLastReport, DEFAULT_SAMPLE, MANUAL_VERIFY_TARGET };
})();
