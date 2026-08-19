window.BuildScoutDallasNow = (() => {
  const SOURCE = {
    id: "dallasnow",
    name: "City of Dallas DallasNow",
    jurisdiction: "Dallas, TX",
    portalUrl: "https://aca-prod.accela.com/DALLASTX",
    officialInfoUrl: "https://dallascityhall.com/departments/sustainabledevelopment/Pages/DallasNow.aspx",
    current: true,
    productionEligible: true,
    launched: "2025-05-05"
  };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function numberValue(value) {
    const n = Number(clean(value).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeRecord(record, index = 0) {
    const permitNumber = clean(
      record.permit_number || record.record_number || record.alt_id || record.id
    );
    if (!permitNumber) throw new Error("DallasNow record is missing a permit/record number.");

    const address = clean(
      record.street_address || record.address || record.location || record.project_address
    );
    const description = clean(
      record.description || record.work_description || record.record_type || record.project_name
    );
    const status = clean(record.status || record.record_status || "Active");
    const issued = clean(record.issued_date || record.issue_date || record.date_issued);
    const updated = clean(record.updated_at || record.status_date || record.last_updated);

    return {
      id: `dallasnow-${permitNumber}`,
      name: clean(record.project_name) || description || `Dallas permit ${permitNumber}`,
      city: "Dallas, TX",
      street_address: address,
      zip_code: clean(record.zip_code || record.zip),
      type: clean(record.project_type || record.record_type || "Commercial"),
      stage: status,
      value: numberValue(record.value || record.valuation || record.job_value),
      units: record.units == null ? null : numberValue(record.units),
      permit_number: permitNumber,
      contractor: clean(record.contractor || record.general_contractor),
      description,
      issued_date: issued,
      source: SOURCE.name,
      source_id: permitNumber,
      source_url: clean(record.source_url) || SOURCE.portalUrl,
      source_verified: true,
      source_current: true,
      production_eligible: true,
      last_source_check: updated || new Date().toISOString(),
      lat: record.lat == null ? null : Number(record.lat),
      lon: record.lon == null ? null : Number(record.lon),
      raw: record,
      _index: index
    };
  }

  function validateProject(project) {
    const errors = [];
    if (!project.permit_number) errors.push("missing permit number");
    if (!project.source_url) errors.push("missing source URL");
    if (!project.street_address) errors.push("missing project address");
    if (!project.description && !project.name) errors.push("missing project description");
    if (!project.source_verified) errors.push("source not verified");
    if (!project.source_current) errors.push("source not current");
    return { valid: errors.length === 0, errors };
  }

  function prepare(records = []) {
    const accepted = [];
    const rejected = [];
    records.forEach((record, index) => {
      try {
        const project = normalizeRecord(record, index);
        const validation = validateProject(project);
        if (validation.valid) accepted.push(project);
        else rejected.push({ record, errors: validation.errors });
      } catch (error) {
        rejected.push({ record, errors: [error.message] });
      }
    });
    return { accepted, rejected, source: SOURCE };
  }

  async function importVerifiedRecords(records = []) {
    const { accepted, rejected } = prepare(records);
    if (!accepted.length) {
      throw new Error("No verified current DallasNow records were eligible for import.");
    }
    if (!window.BuildScoutBackend?.importProjects) {
      throw new Error("BuildScout backend importer is unavailable.");
    }
    const saved = await window.BuildScoutBackend.importProjects(accepted);
    return { saved, rejected };
  }

  return { SOURCE, normalizeRecord, validateProject, prepare, importVerifiedRecords };
})();
