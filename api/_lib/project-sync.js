import { supabaseJson, chunk } from "./supabase-rest.js";

const MANAGED_FIELDS = [
  "name", "city", "street_address", "zip_code", "latitude", "longitude",
  "project_type", "stage", "estimated_value", "opportunity_score", "units",
  "expected_start", "general_contractor", "permit_number", "source_name",
  "source_url", "last_verified"
];

// Verification metadata changes every time a source is checked. It should be
// refreshed on writes, but must not by itself make source data look changed.
const CHANGE_DETECTION_FIELDS = MANAGED_FIELDS.filter((field) => field !== "last_verified");

const NUMERIC_FIELDS = new Set(["latitude","longitude","estimated_value","opportunity_score","units"]);
const DATE_FIELDS = new Set(["expected_start","last_verified"]);
const COORDINATE_FIELDS = new Set(["latitude","longitude"]);
const COORDINATE_DECIMALS = 6;
const CHICAGO_SOURCE_NAME = "City of Chicago — Building Permits";
const DIAGNOSTIC_SAMPLE_LIMIT = 10;

function comparable(field, value) {
  if (value == null || value === "") return null;
  if (NUMERIC_FIELDS.has(field)) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value).trim();
    // Postgres/Supabase may round coordinates when persisting them. Compare
    // coordinates at ~0.1 m precision so storage-only float noise is not a change.
    return COORDINATE_FIELDS.has(field) ? Number(number.toFixed(COORDINATE_DECIMALS)) : number;
  }
  if (DATE_FIELDS.has(field)) return String(value).slice(0, 10);
  return String(value).trim();
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function diagnosticValue(field, value) {
  const normalized = comparable(field, value);
  const stringValue = value == null ? null : String(value);
  return {
    type: valueType(value),
    comparableType: valueType(normalized),
    isNullish: value == null,
    isEmptyString: value === "",
    stringLength: stringValue?.length ?? null,
    trimmedLength: stringValue?.trim().length ?? null,
    datePrefixLength: DATE_FIELDS.has(field) && stringValue ? stringValue.slice(0, 10).length : null,
    numericFinite: NUMERIC_FIELDS.has(field) ? Number.isFinite(Number(value)) : null
  };
}

function rowDiff(existing, incoming) {
  return CHANGE_DETECTION_FIELDS.flatMap((field) => {
    const existingComparable = comparable(field, existing?.[field]);
    const incomingComparable = comparable(field, incoming?.[field]);
    if (existingComparable === incomingComparable) return [];
    return [{
      field,
      existing: diagnosticValue(field, existing?.[field]),
      incoming: diagnosticValue(field, incoming?.[field])
    }];
  });
}

function rowChanged(existing, incoming) {
  return rowDiff(existing, incoming).length > 0;
}

async function getExistingBySource(sourceName) {
  const query = new URLSearchParams({
    select: `id,${MANAGED_FIELDS.join(",")}`,
    source_name: `eq.${sourceName}`,
    limit: "10000"
  });
  const rows = await supabaseJson(`projects?${query.toString()}`);
  return Array.isArray(rows) ? rows : [];
}

async function insertRows(rows) {
  let inserted = 0;
  for (const batch of chunk(rows, 200)) {
    if (!batch.length) continue;
    const saved = await supabaseJson("projects", {
      method: "POST",
      prefer: "return=representation",
      body: batch
    });
    inserted += Array.isArray(saved) ? saved.length : batch.length;
  }
  return inserted;
}

async function updateRows(items, concurrency = 10) {
  let index = 0;
  let updated = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await supabaseJson(`projects?id=eq.${encodeURIComponent(current.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: current.row
      });
      updated += 1;
    }
  });
  await Promise.all(workers);
  return updated;
}

export async function syncProjects(sourceName, projects) {
  const existing = await getExistingBySource(sourceName);
  const existingByPermit = new Map(existing.map((row) => [String(row.permit_number || ""), row]));
  const inserts = [];
  const updates = [];
  const diagnosticsEnabled = sourceName === CHICAGO_SOURCE_NAME;
  const fieldCounts = {};
  const samples = [];
  let unchanged = 0;
  let duplicates = 0;
  const seen = new Set();

  for (const project of projects) {
    const permit = String(project?.permit_number || "").trim();
    if (!permit) continue;
    if (seen.has(permit)) {
      duplicates += 1;
      continue;
    }
    seen.add(permit);
    const current = existingByPermit.get(permit);
    if (!current) {
      inserts.push(project);
    } else if (rowChanged(current, project)) {
      updates.push({ id: current.id, row: project });
      if (diagnosticsEnabled) {
        const differences = rowDiff(current, project);
        for (const difference of differences) {
          fieldCounts[difference.field] = (fieldCounts[difference.field] || 0) + 1;
        }
        if (samples.length < DIAGNOSTIC_SAMPLE_LIMIT) {
          samples.push({
            changedFields: differences.map((difference) => difference.field),
            differences
          });
        }
      }
    } else {
      unchanged += 1;
    }
  }

  const inserted = await insertRows(inserts);
  const updated = await updateRows(updates);

  return {
    existingBefore: existing.length,
    inserted,
    updated,
    unchanged,
    duplicates,
    processed: inserted + updated + unchanged,
    ...(diagnosticsEnabled ? {
      syncDiagnostics: {
        differingRecords: updates.length,
        sampledRecords: samples.length,
        sampleLimit: DIAGNOSTIC_SAMPLE_LIMIT,
        fieldCounts,
        samples
      }
    } : {})
  };
}

export async function createSyncRun(sourceName) {
  try {
    const rows = await supabaseJson("sync_runs", {
      method: "POST",
      prefer: "return=representation",
      body: [{ source: sourceName, status: "running", started_at: new Date().toISOString() }]
    });
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    return { telemetryUnavailable: true, warning: error.message };
  }
}

export async function findActiveSync(sourceName) {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const params = new URLSearchParams({
      select: "id,started_at,status",
      source: `eq.${sourceName}`,
      status: "eq.running",
      started_at: `gt.${cutoff}`,
      limit: "1"
    });
    const rows = await supabaseJson(`sync_runs?${params.toString()}`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

export async function finishSyncRun(run, report, status = "success", errorSummary = null) {
  if (!run?.id || run.telemetryUnavailable) return;
  try {
    await supabaseJson(`sync_runs?id=eq.${encodeURIComponent(run.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        status,
        completed_at: new Date().toISOString(),
        records_fetched: report?.fetched || 0,
        records_eligible: report?.eligible || 0,
        records_inserted: report?.inserted || 0,
        records_updated: report?.updated || 0,
        records_unchanged: report?.unchanged || 0,
        records_rejected: report?.rejected || 0,
        duplicate_count: report?.duplicates || 0,
        error_summary: errorSummary
      }
    });
  } catch {
    // Telemetry must never convert a successful source sync into a failed production sync.
  }
}
