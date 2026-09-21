import { fetchAustinRecords, AUSTIN_SOURCE } from "./_lib/austin-source.js";
import { getSupabaseConfig } from "./_lib/supabase-rest.js";
import { createSyncRun, findActiveSync, finishSyncRun, syncProjects } from "./_lib/project-sync.js";

function bearer(req) {
  const header = String(req.headers?.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function authorized(req) {
  const token = bearer(req);
  const allowed = [process.env.CRON_SECRET, process.env.BUILDSCOUT_SYNC_SECRET].filter(Boolean);
  return allowed.length > 0 && allowed.includes(token);
}

function numberParam(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  if (!authorized(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    getSupabaseConfig();
  } catch (error) {
    return res.status(503).json({ error: "server_configuration_missing", message: error.message });
  }

  const existingRun = await findActiveSync(AUSTIN_SOURCE.name);
  if (existingRun) {
    return res.status(409).json({ error: "sync_already_running", startedAt: existingRun.started_at });
  }

  const maxRecords = numberParam(req.query?.limit ?? req.body?.limit, 1000, 1, 5000);
  const pageSize = numberParam(req.query?.pageSize ?? req.body?.pageSize, 500, 25, 1000);
  const run = await createSyncRun(AUSTIN_SOURCE.name);
  const startedAt = new Date().toISOString();

  try {
    const sourceReport = await fetchAustinRecords({ maxRecords, pageSize });
    const persisted = await syncProjects(AUSTIN_SOURCE.name, sourceReport.projects);
    const report = {
      source: AUSTIN_SOURCE.name,
      sourceId: AUSTIN_SOURCE.id,
      startedAt,
      completedAt: new Date().toISOString(),
      requestedMax: maxRecords,
      pageSize,
      fetched: sourceReport.fetched,
      eligible: sourceReport.eligible,
      rejected: sourceReport.rejected,
      duplicates: sourceReport.duplicates + persisted.duplicates,
      existingBefore: persisted.existingBefore,
      inserted: persisted.inserted,
      updated: persisted.updated,
      unchanged: persisted.unchanged,
      processed: persisted.processed,
      telemetry: run?.telemetryUnavailable ? "migration-required" : "recorded"
    };
    await finishSyncRun(run, report, "success");
    return res.status(200).json(report);
  } catch (error) {
    const report = { source: AUSTIN_SOURCE.name, startedAt, fetched: 0, eligible: 0, rejected: 0, duplicates: 0, inserted: 0, updated: 0, unchanged: 0 };
    await finishSyncRun(run, report, "failed", error.message);
    console.error("Austin sync failed", error);
    return res.status(500).json({ error: "sync_failed", message: error.message });
  }
}
