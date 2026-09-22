import { getSupabaseConfig } from "./supabase-rest.js";
import { createSyncRun, findActiveSync, finishSyncRun, syncProjects } from "./project-sync.js";
import { enrichSyncedProjects } from "./project-enrichment.js";

function bearer(req){const h=String(req.headers?.authorization||"");return h.startsWith("Bearer ")?h.slice(7).trim():"";}
function authorized(req){const token=bearer(req);const allowed=[process.env.CRON_SECRET,process.env.BUILDSCOUT_SYNC_SECRET].filter(Boolean);return allowed.length>0&&allowed.includes(token);}
function numberParam(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(Math.floor(n),max)):fallback;}

export async function runSourceSync(req,res,source,fetchRecords){
  if(!["GET","POST"].includes(req.method)){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"method_not_allowed"});}
  res.setHeader("Cache-Control","no-store");
  if(!authorized(req)) return res.status(401).json({error:"unauthorized"});
  try{getSupabaseConfig();}catch(error){return res.status(503).json({error:"server_configuration_missing",message:error.message});}
  const active=await findActiveSync(source.name);
  if(active)return res.status(409).json({error:"sync_already_running",startedAt:active.started_at});
  const maxRecords=numberParam(req.query?.limit??req.body?.limit,1000,1,5000);
  const pageSize=numberParam(req.query?.pageSize??req.body?.pageSize,500,25,1000);
  const run=await createSyncRun(source.name),startedAt=new Date().toISOString();
  try{
    const sourceReport=await fetchRecords({maxRecords,pageSize});
    const persisted=await syncProjects(source.name,sourceReport.projects);
    let enrichment={status:"not-run",projectsMatched:0,sourcesAttached:0,companiesAttached:0};
    try{
      enrichment={status:"complete",...(await enrichSyncedProjects(source,sourceReport.projects))};
    }catch(error){
      console.error(`${source.id} enrichment failed`,error);
      enrichment={status:"failed",message:error.message,projectsMatched:0,sourcesAttached:0,companiesAttached:0};
    }
    const report={source:source.name,sourceId:source.id,startedAt,completedAt:new Date().toISOString(),requestedMax:maxRecords,pageSize,fetched:sourceReport.fetched,eligible:sourceReport.eligible,rejected:sourceReport.rejected,duplicates:sourceReport.duplicates+persisted.duplicates,existingBefore:persisted.existingBefore,inserted:persisted.inserted,updated:persisted.updated,unchanged:persisted.unchanged,processed:persisted.processed,telemetry:run?.telemetryUnavailable?"migration-required":"recorded",enrichment,...(sourceReport.companyRoleAudit?{companyRoleAudit:sourceReport.companyRoleAudit}:{}),...(persisted.syncDiagnostics?{syncDiagnostics:persisted.syncDiagnostics}:{})};
    if(persisted.syncDiagnostics) console.info("[CHICAGO SYNC DIFF]",JSON.stringify(persisted.syncDiagnostics));
    await finishSyncRun(run,report,"success");return res.status(200).json(report);
  }catch(error){
    const report={source:source.name,startedAt,fetched:0,eligible:0,rejected:0,duplicates:0,inserted:0,updated:0,unchanged:0};
    await finishSyncRun(run,report,"failed",error.message);console.error(`${source.id} sync failed`,error);return res.status(500).json({error:"sync_failed",message:error.message});
  }
}
