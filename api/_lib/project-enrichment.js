import { supabaseJson, chunk } from "./supabase-rest.js";

function clean(v){return String(v==null?"":v).trim();}
function sourceTypeFor(sourceName){return /city|county|state|department|government/i.test(clean(sourceName))?"official_public_record":"licensed_provider";}
function confidenceFor(project){return project?.source_url&&project?.source_name?"source-backed":"unknown";}

async function getProjectIds(sourceName,permitNumbers){
  const result=new Map();
  for(const batch of chunk(permitNumbers.filter(Boolean),100)){
    const params=new URLSearchParams({select:"id,permit_number",source_name:`eq.${sourceName}`,permit_number:`in.(${batch.map(v=>`"${String(v).replaceAll('"','\\"')}"`).join(",")})`});
    const rows=await supabaseJson(`projects?${params.toString()}`);
    (rows||[]).forEach(row=>result.set(String(row.permit_number),row.id));
  }
  return result;
}

async function upsertSources(rows){
  for(const batch of chunk(rows,200)){
    if(!batch.length)continue;
    await supabaseJson("project_sources?on_conflict=project_id,source_name,source_record_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:batch});
  }
}
async function upsertCompanies(rows){
  for(const batch of chunk(rows,200)){
    if(!batch.length)continue;
    await supabaseJson("project_companies?on_conflict=project_id,company_name,role",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:batch});
  }
}

export async function enrichSyncedProjects(source,projects=[]){
  const permitNumbers=projects.map(p=>clean(p?.permit_number)).filter(Boolean);
  if(!permitNumbers.length)return{projectsMatched:0,sourcesAttached:0,companiesAttached:0};
  const ids=await getProjectIds(source.name,permitNumbers);
  const sourceRows=[],companyRows=[];
  for(const p of projects){
    const key=clean(p?.permit_number),projectId=ids.get(key);
    if(!projectId)continue;
    sourceRows.push({project_id:projectId,source_name:source.name,source_type:sourceTypeFor(source.name),source_record_id:key,source_url:p.source_url||null,observed_at:new Date().toISOString(),verified_at:p.last_verified||new Date().toISOString(),confidence:confidenceFor(p),metadata:{jurisdiction:source.jurisdiction||null,authority:source.authority||null}});
    const gc=clean(p.general_contractor);
    if(gc&&gc.toLowerCase()!=="unknown")companyRows.push({project_id:projectId,company_name:gc,role:"General Contractor",confidence:"source-backed",verified_at:p.last_verified||new Date().toISOString()});
    const developer=clean(p.developer);
    if(developer&&developer.toLowerCase()!=="unknown")companyRows.push({project_id:projectId,company_name:developer,role:"Developer / Owner",confidence:"source-backed",verified_at:p.last_verified||new Date().toISOString()});
  }
  await upsertSources(sourceRows);await upsertCompanies(companyRows);
  return{projectsMatched:ids.size,sourcesAttached:sourceRows.length,companiesAttached:companyRows.length};
}
