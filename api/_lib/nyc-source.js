export const NYC_SOURCE = {
  id: "nyc-dob-permit-issuance",
  name: "NYC Department of Buildings — DOB Permit Issuance",
  authority: "New York City Department of Buildings",
  jurisdiction: "New York City, NY",
  datasetId: "ipu4-2q9a",
  apiUrl: "https://data.cityofnewyork.us/resource/ipu4-2q9a.json",
  portalUrl: "https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/ipu4-2q9a"
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

function permitKey(record) {
  const permitSi = first(record, ["permit_si_no"]);
  if (permitSi) return permitSi;
  return [
    first(record, ["job__"]),
    first(record, ["job_doc___"]),
    first(record, ["permit_type"]),
    first(record, ["permit_sequence__"])
  ].filter(Boolean).join("-");
}

export function normalizeNycRecord(record, checkedAt = new Date().toISOString()) {
  const sourceId = permitKey(record);
  if (!sourceId) return { rejected: true, reason: "missing permit identifier", raw: record };

  const house = first(record, ["house__"]);
  const street = first(record, ["street_name"]);
  const address = [house, street].filter(Boolean).join(" ");
  const borough = first(record, ["borough"]);
  const jobType = first(record, ["job_type"]);
  const workType = first(record, ["work_type"]);
  const status = first(record, ["permit_status", "filing_status"]) || "Issued";
  const business = first(record, ["permittee_s_business_name"]);
  const firstName = first(record, ["permittee_s_first_name"]);
  const lastName = first(record, ["permittee_s_last_name"]);
  const permittee = business || [firstName, lastName].filter(Boolean).join(" ");

  return {
    rejected: false,
    sourceId,
    permitNumber: sourceId,
    project: {
      name: address ? `${jobType || workType || "Construction"} — ${address}` : `NYC permit ${sourceId}`,
      city: borough ? `${borough}, NY` : "New York City, NY",
      street_address: address || null,
      zip_code: first(record, ["zip_code"]) || null,
      latitude: null,
      longitude: null,
      project_type: [jobType, workType].filter(Boolean).join(" / ") || "Construction",
      stage: status,
      estimated_value: numberOrNull(first(record, ["estimated_job_costs", "estimated_job_cost"])),
      opportunity_score: 70,
      units: null,
      expected_start: first(record, ["issuance_date"]) || null,
      general_contractor: permittee || null,
      permit_number: sourceId,
      source_name: NYC_SOURCE.name,
      source_url: NYC_SOURCE.portalUrl,
      last_verified: String(checkedAt).slice(0, 10)
    }
  };
}

export async function fetchNycPage({ limit = 500, offset = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 1000));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const params = new URLSearchParams({
    "$limit": String(safeLimit),
    "$offset": String(safeOffset),
    "$order": "issuance_date DESC, permit_si_no DESC"
  });
  const response = await fetch(`${NYC_SOURCE.apiUrl}?${params}`);
  if (!response.ok) throw new Error(`NYC DOB permit feed returned HTTP ${response.status}.`);
  return response.json();
}

export async function fetchNycRecords({ maxRecords = 1000, pageSize = 500 } = {}) {
  const max = Math.max(1, Math.min(Number(maxRecords) || 1000, 5000));
  const size = Math.max(25, Math.min(Number(pageSize) || 500, 1000));
  const checkedAt = new Date().toISOString();
  const raw = [];

  for (let offset = 0; offset < max; offset += size) {
    const remaining = max - offset;
    const page = await fetchNycPage({ limit: Math.min(size, remaining), offset });
    raw.push(...page);
    if (page.length < Math.min(size, remaining)) break;
  }

  const accepted = [];
  const seen = new Set();
  let rejected = 0;
  let duplicates = 0;

  for (const record of raw) {
    const normalized = normalizeNycRecord(record, checkedAt);
    if (normalized.rejected) { rejected += 1; continue; }
    const key = `${NYC_SOURCE.name}|${normalized.permitNumber}`;
    if (seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    accepted.push(normalized.project);
  }

  return { source: NYC_SOURCE, checkedAt, fetched: raw.length, eligible: accepted.length, rejected, duplicates, projects: accepted };
}
