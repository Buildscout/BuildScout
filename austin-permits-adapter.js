window.BuildScoutAustinPermits = (() => {
  const SOURCE = {
    id: "austin-issued-construction-permits",
    name: "City of Austin — Issued Construction Permits",
    jurisdiction: "Austin, TX",
    country: "US",
    authority: "City of Austin Development Services",
    datasetId: "3syk-w9eu",
    apiUrl: "https://data.austintexas.gov/resource/3syk-w9eu.json",
    portalUrl: "https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu",
    current: true,
    productionEligible: true,
    updateFrequency: "Daily"
  };

  function clean(v){ return String(v == null ? "" : v).trim(); }
  function numberValue(v){ const n = Number(clean(v).replace(/[$,]/g, "")); return Number.isFinite(n) ? n : 0; }
  function first(record, keys){ for (const key of keys) if (clean(record?.[key])) return clean(record[key]); return ""; }

  function normalizeRecord(record, index = 0){
    const permitNumber = first(record, ["permit_number", "permit_num", "permitnumber"]);
    const projectId = first(record, ["project_id", "projectid", "folderrsn"]);
    const sourceId = permitNumber || projectId;
    if (!sourceId) throw new Error("Austin permit record is missing permit/project ID.");

    const address = first(record, ["original_address1", "address", "street_address", "location"]);
    const description = first(record, ["description", "work_description", "permit_type_desc", "permit_class"]);
    const issueDate = first(record, ["issue_date", "issued_date", "issueddate"]);
    const status = first(record, ["status_current", "status", "permit_status"]) || "Issued";
    const verifiedAt = clean(record.__buildscout_verified_at);

    return {
      id: `austin-${sourceId}`,
      name: first(record, ["project_name"]) || description || `Austin permit ${sourceId}`,
      city: "Austin, TX",
      street_address: address,
      zip_code: first(record, ["original_zip", "zip_code", "zip"]),
      type: first(record, ["permit_class_mapped", "permit_type_desc", "permit_type"]) || "Construction",
      stage: status,
      value: numberValue(first(record, ["total_job_valuation", "valuation", "job_value"])),
      units: first(record, ["housing_units", "units"]) ? numberValue(first(record, ["housing_units", "units"])) : null,
      permit_number: permitNumber || sourceId,
      contractor: first(record, ["contractor_company_name", "contractor", "general_contractor"]),
      description,
      issued_date: issueDate,
      source: SOURCE.name,
      source_id: sourceId,
      source_url: SOURCE.portalUrl,
      source_jurisdiction: SOURCE.jurisdiction,
      source_country: SOURCE.country,
      source_authority: SOURCE.authority,
      source_verified: record.__buildscout_source_verified === true,
      source_current: true,
      production_eligible: record.__buildscout_source_verified === true,
      last_source_check: verifiedAt,
      lat: record.latitude == null ? null : Number(record.latitude),
      lon: record.longitude == null ? null : Number(record.longitude),
      raw: record,
      _index: index
    };
  }

  async function fetchRecent(limit = 100){
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 1000));
    const params = new URLSearchParams({ "$limit": String(safeLimit), "$order": "issue_date DESC" });
    const response = await fetch(`${SOURCE.apiUrl}?${params}`);
    if (!response.ok) throw new Error(`Austin permit feed returned HTTP ${response.status}.`);
    const checkedAt = new Date().toISOString();
    const rows = await response.json();
    return rows.map(row => ({ ...row, __buildscout_source_verified: true, __buildscout_verified_at: checkedAt }));
  }

  async function preview(limit = 100){
    const records = await fetchRecent(limit);
    return window.BuildScoutSourceAdapters.prepare(SOURCE.id, records);
  }

  async function importRecent(limit = 100){
    const records = await fetchRecent(limit);
    return window.BuildScoutSourceAdapters.importVerified(SOURCE.id, records);
  }

  const adapter = { ...SOURCE, normalizeRecord };
  window.BuildScoutSourceAdapters?.register(adapter);
  return { SOURCE, normalizeRecord, fetchRecent, preview, importRecent };
})();
