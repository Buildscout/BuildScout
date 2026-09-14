import { supabaseJson, supabaseRaw } from "./_lib/supabase-rest.js";

const AUSTIN = "City of Austin — Issued Construction Permits";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const countParams = new URLSearchParams({ select: "id", source_name: `eq.${AUSTIN}` });
    const countResponse = await supabaseRaw(`projects?${countParams.toString()}`, {
      headers: { Range: "0-0" },
      prefer: "count=exact"
    });
    const contentRange = countResponse.headers.get("content-range") || "0-0/0";
    const total = Number(contentRange.split("/")[1]) || 0;

    let latest = null;
    try {
      const params = new URLSearchParams({
        select: "source,status,started_at,completed_at,records_fetched,records_inserted,records_updated,records_unchanged,records_rejected,duplicate_count,error_summary",
        source: `eq.${AUSTIN}`,
        order: "started_at.desc",
        limit: "1"
      });
      const rows = await supabaseJson(`sync_runs?${params.toString()}`);
      latest = Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch {
      latest = null;
    }

    return res.status(200).json({
      sources: {
        austin: {
          name: AUSTIN,
          status: "live",
          records: total,
          latestSync: latest
        }
      }
    });
  } catch (error) {
    console.error("Sync status failed", error);
    return res.status(503).json({ error: "status_unavailable" });
  }
}
