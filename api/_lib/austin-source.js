export const AUSTIN_SOURCE = {
  id: "austin-issued-construction-permits",
  name: "City of Austin — Issued Construction Permits",
  authority: "City of Austin Development Services",
  jurisdiction: "Austin, TX",
  datasetId: "3syk-w9eu",
  apiUrl: "https://data.austintexas.gov/resource/3syk-w9eu.json",
  portalUrl: "https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu"
};

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function first(record, keys) {
  for (const key of keys) {
    const value = clean(record?.[key]);
    if (value) return value;
  }
  return "";
}

function numberOrNull(value) {
  const raw = clean(value);
  if (!raw) return null;
  const number = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function normalizeAustinRecord(record, checkedAt = new Date().toISOString()) {
  const permitNumber = first(record, ["permit_number", "permit_num", "permitnumber"]);
  const projectId = first(record, ["project_id", "projectid", "folderrsn"]);
  const sourceId = permitNumber || projectId;
  if (!sourceId) return { rejected: true, reason: "missing permit/project ID", raw: record };

  const description = first(record, ["description", "work_description", "permit_type_desc", "permit_class"]);
  const address = first(record, ["original_address1", "address", "street_address", "location"]);
  const status = first(record, ["status_current", "status", "permit_status"]) || "Issued";

  return {
    rejected: false,
    sourceId,
    permitNumber: permitNumber || sourceId,
    project: {
      name: first(record, ["project_name"]) || description || `Austin permit ${sourceId}`,
      city: "Austin, TX",
      street_address: address || null,
      zip_code: first(record, ["original_zip", "zip_code", "zip"]) || null,
      latitude: Number.isFinite(Number(record?.latitude)) ? Number(record.latitude) : null,
      longitude: Number.isFinite(Number(record?.longitude)) ? Number(record.longitude) : null,
      project_type: first(record, ["permit_class_mapped", "permit_type_desc", "permit_type"]) || "Construction",
      stage: status,
      estimated_value: numberOrNull(first(record, ["total_job_valuation", "valuation", "job_value"])),
      opportunity_score: 70,
      units: numberOrNull(first(record, ["number_of_units", "housing_units", "units"])),
      expected_start: null,
      general_contractor: first(record, ["contractor_company_name", "contractor", "general_contractor"]) || null,
      permit_number: permitNumber || sourceId,
      source_name: AUSTIN_SOURCE.name,
      source_url: AUSTIN_SOURCE.portalUrl,
      last_verified: String(checkedAt).slice(0, 10)
    }
  };
}

export async function fetchAustinPage({ limit = 200, offset = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const params = new URLSearchParams({
    "$limit": String(safeLimit),
    "$offset": String(safeOffset),
    "$order": "issue_date DESC, permit_number DESC"
  });
  const response = await fetch(`${AUSTIN_SOURCE.apiUrl}?${params}`);
  if (!response.ok) throw new Error(`Austin permit feed returned HTTP ${response.status}.`);
  return response.json();
}

export async function fetchAustinRecords({ maxRecords = 1000, pageSize = 200 } = {}) {
  const max = Math.max(1, Math.min(Number(maxRecords) || 1000, 5000));
  const size = Math.max(25, Math.min(Number(pageSize) || 200, 1000));
  const checkedAt = new Date().toISOString();
  const raw = [];

  for (let offset = 0; offset < max; offset += size) {
    const remaining = max - offset;
    const page = await fetchAustinPage({ limit: Math.min(size, remaining), offset });
    raw.push(...page);
    if (page.length < Math.min(size, remaining)) break;
  }

  const accepted = [];
  const rejected = [];
  const seen = new Set();
  let duplicates = 0;

  for (const record of raw) {
    const normalized = normalizeAustinRecord(record, checkedAt);
    if (normalized.rejected) {
      rejected.push({ reason: normalized.reason });
      continue;
    }
    const key = `${AUSTIN_SOURCE.name}|${normalized.permitNumber}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    accepted.push(normalized.project);
  }

  return {
    source: AUSTIN_SOURCE,
    checkedAt,
    fetched: raw.length,
    eligible: accepted.length,
    rejected: rejected.length,
    duplicates,
    projects: accepted
  };
}
