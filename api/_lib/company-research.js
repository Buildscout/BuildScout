import { supabaseJson } from "./supabase-rest.js";

function clean(v){return String(v==null?"":v).trim();}
function boundedLimit(v){const n=Number(v);return Number.isFinite(n)?Math.max(1,Math.min(Math.trunc(n),100)):25;}

export async function getCompanyResearchBatch(limit=25){
  const params=new URLSearchParams({
    select:"id,project_company_id,status,priority,attempt_count,next_attempt_at",
    status:"eq.pending",
    order:"priority.desc,created_at.asc",
    limit:String(boundedLimit(limit))
  });
  const queue=await supabaseJson(`company_enrichment_queue?${params.toString()}`)||[];
  const now=new Date().toISOString();
  const ready=queue.filter(x=>!x.next_attempt_at||x.next_attempt_at<=now);
  if(!ready.length)return[];
  const ids=ready.map(x=>x.project_company_id);
  const companyParams=new URLSearchParams({
    select:"id,project_id,company_name,role,website,phone,source_id,confidence,verified_at",
    id:`in.(${ids.join(",")})`
  });
  const companies=await supabaseJson(`project_companies?${companyParams.toString()}`)||[];
  const byId=new Map(companies.map(x=>[x.id,x]));
  return ready.map(queueItem=>({queue:queueItem,company:byId.get(queueItem.project_company_id)||null})).filter(x=>x.company);
}

export async function claimCompanyResearch(queueId){
  const now=new Date().toISOString();
  const rows=await supabaseJson(`company_enrichment_queue?id=eq.${encodeURIComponent(queueId)}&status=eq.pending`,{
    method:"PATCH",prefer:"return=representation",
    body:{status:"researching",last_attempt_at:now,updated_at:now}
  })||[];
  return rows[0]||null;
}

export async function saveCompanyResearch(company,queueItem,result={}){
  const now=new Date().toISOString();
  const website=clean(result.website),phone=clean(result.phone);
  const evidence=clean(result.evidence);
  if((website||phone)&&!evidence)throw new Error("Company facts require evidence.");
  if(website||phone){
    const update={verified_at:now};
    if(website)update.website=website;
    if(phone)update.phone=phone;
    await supabaseJson(`project_companies?id=eq.${encodeURIComponent(company.id)}`,{method:"PATCH",prefer:"return=minimal",body:update});
  }
  const status=(website||phone)?"complete":"no_match";
  await supabaseJson(`company_enrichment_queue?id=eq.${encodeURIComponent(queueItem.id)}`,{
    method:"PATCH",prefer:"return=minimal",
    body:{status,attempt_count:Number(queueItem.attempt_count||0)+1,last_attempt_at:now,next_attempt_at:null,result_summary:evidence||"No verified public company contact channel found.",updated_at:now}
  });
  return{status,website:website||null,phone:phone||null};
}

export async function failCompanyResearch(queueItem,message){
  const attempts=Number(queueItem.attempt_count||0)+1;
  const retry=attempts<3;
  const now=new Date().toISOString();
  await supabaseJson(`company_enrichment_queue?id=eq.${encodeURIComponent(queueItem.id)}`,{
    method:"PATCH",prefer:"return=minimal",
    body:{status:retry?"pending":"failed",attempt_count:attempts,last_attempt_at:now,next_attempt_at:retry?new Date(Date.now()+attempts*60*60*1000).toISOString():null,result_summary:clean(message)||"Company research failed.",updated_at:now}
  });
}
