import { supabaseJson, supabaseRaw } from "./_lib/supabase-rest.js";

const SOURCES = {
  austin: "City of Austin — Issued Construction Permits",
  nyc: "NYC Department of Buildings — DOB Permit Issuance"
};

function healthFor(latest) {
  if (!latest) return { state:"telemetry_pending", message:"Project feed is configured; sync telemetry has not been recorded yet." };
  if (latest.status === "failed") return { state:"error", message:latest.error_summary || "Latest sync failed." };
  if (latest.status === "running") return { state:"syncing", message:"A production sync is currently running." };
  const finished = latest.completed_at ? Date.parse(latest.completed_at) : NaN;
  const ageHours = Number.isFinite(finished) ? (Date.now()-finished)/36e5 : Infinity;
  if (ageHours > 36) return { state:"stale", message:"Latest successful sync is more than 36 hours old." };
  return { state:"healthy", message:"Production source is current." };
}

async function sourceStatus(name) {
  const countParams=new URLSearchParams({select:"id",source_name:`eq.${name}`});
  const countResponse=await supabaseRaw(`projects?${countParams.toString()}`,{headers:{Range:"0-0"},prefer:"count=exact"});
  const total=Number((countResponse.headers.get("content-range")||"0-0/0").split("/")[1])||0;
  let latest=null, telemetryAvailable=true;
  try {
    const params=new URLSearchParams({
      select:"source,status,started_at,completed_at,records_fetched,records_inserted,records_updated,records_unchanged,records_rejected,duplicate_count,error_summary",
      source:`eq.${name}`,order:"started_at.desc",limit:"1"
    });
    const rows=await supabaseJson(`sync_runs?${params.toString()}`);
    latest=Array.isArray(rows)&&rows.length?rows[0]:null;
  } catch { telemetryAvailable=false; }
  return {name,status:total>0?"live":"ready",records:total,telemetryAvailable,latestSync:latest,health:healthFor(latest)};
}

export default async function handler(req,res) {
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"method_not_allowed"});}
  res.setHeader("Cache-Control","no-store");
  try {
    const [austin,nyc]=await Promise.all([sourceStatus(SOURCES.austin),sourceStatus(SOURCES.nyc)]);
    return res.status(200).json({generatedAt:new Date().toISOString(),sources:{austin,nyc}});
  } catch(error) {
    console.error("Sync status failed",error);
    return res.status(503).json({error:"status_unavailable"});
  }
}
