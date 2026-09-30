import { supabaseJson, chunk } from "./supabase-rest.js";

function clean(v){return String(v==null?"":v).trim();}
function sourceTypeFor(sourceName){return /city|county|state|department|government/i.test(clean(sourceName))?"official_public_record":"licensed_provider";}
function confidenceFor(project){return project?.source_url&&project?.source_name?"source-backed":"unknown";}
function normalizeCompanyName(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}\nfunction validCompanyName(v){const raw=clean(v);return Boolean(raw)&&raw.toLowerCase()!=="unknown"&&Boolean(normalizeCompanyName(raw));}

async function ensureCanonicalCompanies(companyRows){
  const unique=new Map();
  for(const row of companyRows){const normalized_name=normalizeCompanyName(row.company_name);if(normalized_name&&!unique.has(normalized_name))unique.set(normalized_name,{name:row.company_name,normalized_name,display_name:row.company_name,confidence:row.confidence,verified_at:row.verified_at});}
  for(const batch of chunk([...unique.values()],200)){if(batch.length)await supabaseJson("companies?on_conflict=normalized_name",{method:"POST",prefer:"resolution=ignore-duplicates,return=minimal",body:batch});}
  const ids=new Map(),names=[...unique.keys()];
  for(const batch of chunk(names,100)){if(!batch.length)continue;const params=new URLSearchParams({select:"id,normalized_name",normalized_name:`in.(${batch.map(v=>`"${v.replaceAll('"','\\"')}"`).join(",")})`});const rows=await supabaseJson(`companies?${params.toString()}`)||[];rows.forEach(x=>ids.set(x.normalized_name,x.id));}
  companyRows.forEach(row=>{row.company_id=ids.get(normalizeCompanyName(row.company_name))||null;});
  return ids.size;
}

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
    if(validCompanyName(gc))companyRows.push({project_id:projectId,company_name:gc,role:"General Contractor",confidence:"source-backed",verified_at:p.last_verified||new Date().toISOString()});
    const developer=clean(p.developer);
    if(validCompanyName(developer))companyRows.push({project_id:projectId,company_name:developer,role:"Developer / Owner",confidence:"source-backed",verified_at:p.last_verified||new Date().toISOString()});
  }
  await upsertSources(sourceRows);const canonicalCompanies=await ensureCanonicalCompanies(companyRows);await upsertCompanies(companyRows);
  return{projectsMatched:ids.size,sourcesAttached:sourceRows.length,companiesAttached:companyRows.length,canonicalCompanies};
}
