import { supabaseJson } from "./supabase-rest.js";

function clean(v){return String(v==null?"":v).trim();}
function boundedLimit(v){const n=Number(v);return Number.isFinite(n)?Math.max(1,Math.min(Math.trunc(n),100)):25;}

export async function getCompanyResearchBatch(limit=25){
  const now=new Date().toISOString();
  const params=new URLSearchParams({
    select:"id,company_id,status,priority,attempt_count,next_attempt_at",
    status:"eq.pending",
    or:`(next_attempt_at.is.null,next_attempt_at.lte.${now})`,
    order:"priority.desc,created_at.asc",
    limit:String(boundedLimit(limit))
  });
  const ready=await supabaseJson(`canonical_company_enrichment_queue?${params.toString()}`)||[];
  if(!ready.length)return[];
  const ids=ready.map(x=>x.company_id);
  const companyParams=new URLSearchParams({
    select:"id,name,display_name,normalized_name,website,phone,provider,provider_record_id,confidence,verified_at",
    id:`in.(${ids.join(",")})`
  });
  const companies=await supabaseJson(`companies?${companyParams.toString()}`)||[];
  const byId=new Map(companies.map(x=>[x.id,x]));
  return ready.map(queueItem=>{
    const canonical=byId.get(queueItem.company_id);
    if(!canonical)return null;
    return{queue:queueItem,company:{id:canonical.id,company_id:canonical.id,company_name:canonical.display_name||canonical.name,website:canonical.website,phone:canonical.phone,confidence:canonical.confidence,verified_at:canonical.verified_at}};
  }).filter(Boolean);
}

export async function claimCompanyResearch(queueId){
  const now=new Date().toISOString();
  const rows=await supabaseJson(`canonical_company_enrichment_queue?id=eq.${encodeURIComponent(queueId)}&status=eq.pending`,{
    method:"PATCH",prefer:"return=representation",
    body:{status:"researching",last_attempt_at:now,updated_at:now}
  })||[];
  return rows[0]||null;
}

export async function saveCompanyResearch(company,queueItem,result={}){
  const now=new Date().toISOString();
  const website=clean(result.website),phone=clean(result.phone),evidence=clean(result.evidence),providerRecordId=clean(result.providerRecordId);
  if((website||phone)&&!evidence)throw new Error("Company facts require evidence.");
  if(website||phone){
    const update={verified_at:now,provider:clean(result.provider)||"apollo"};
    if(providerRecordId)update.provider_record_id=providerRecordId;
    if(website)update.website=website;
    if(phone)update.phone=phone;
    await supabaseJson(`companies?id=eq.${encodeURIComponent(company.company_id)}`,{method:"PATCH",prefer:"return=minimal",body:update});
    const relationshipUpdate={verified_at:now};
    if(website)relationshipUpdate.website=website;
    if(phone)relationshipUpdate.phone=phone;
    await supabaseJson(`project_companies?company_id=eq.${encodeURIComponent(company.company_id)}`,{method:"PATCH",prefer:"return=minimal",body:relationshipUpdate});
  }
  if(result.status==="deferred"||result.status==="needs_domain"){
    const attempts=Number(queueItem.attempt_count||0)+1;
    // Keep deferred work pending so it can resume automatically when the
    // provider/access condition changes. Use a long backoff for provider
    // access issues and domain-discovery gaps rather than burning credits.
    const retryAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
    await supabaseJson(`canonical_company_enrichment_queue?id=eq.${encodeURIComponent(queueItem.id)}`,{
      method:"PATCH",prefer:"return=minimal",
      body:{
        status:"pending",
        attempt_count:attempts,
        last_attempt_at:now,
        next_attempt_at:retryAt,
        result_summary:evidence||"Deferred until a verified company domain is available.",
        updated_at:now
      }
    });
    return{status:"deferred",website:null,phone:null};
  }
  const status=(result.providerRecordId&&website)?"complete":"no_match";
  await supabaseJson(`canonical_company_enrichment_queue?id=eq.${encodeURIComponent(queueItem.id)}`,{
    method:"PATCH",prefer:"return=minimal",
    body:{status,attempt_count:Number(queueItem.attempt_count||0)+1,last_attempt_at:now,next_attempt_at:null,result_summary:evidence||"No verified public company contact channel found.",updated_at:now}
  });
  return{status,website:website||null,phone:phone||null};
}

export async function failCompanyResearch(queueItem,message){
  const attempts=Number(queueItem.attempt_count||0)+1,retry=attempts<3,now=new Date().toISOString();
  await supabaseJson(`canonical_company_enrichment_queue?id=eq.${encodeURIComponent(queueItem.id)}`,{
    method:"PATCH",prefer:"return=minimal",
    body:{status:retry?"pending":"failed",attempt_count:attempts,last_attempt_at:now,next_attempt_at:retry?new Date(Date.now()+attempts*60*60*1000).toISOString():null,result_summary:clean(message)||"Company research failed.",updated_at:now}
  });
}
