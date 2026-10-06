import { getCompanyResearchBatch, claimCompanyResearch, saveCompanyResearch, failCompanyResearch } from "./_lib/company-research.js";
import { companyResearchProviderConfigured, researchCompany } from "./_lib/company-research-provider.js";

function bearer(req){const h=String(req.headers?.authorization||"");return h.startsWith("Bearer ")?h.slice(7).trim():"";}
function authorized(req){
  const token=bearer(req);
  const allowed=[process.env.CRON_SECRET,process.env.BUILDSCOUT_SYNC_SECRET].filter(Boolean);
  return allowed.length>0&&allowed.includes(token);
}

export default async function handler(req,res){
  if(!["GET","POST"].includes(req.method)){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Method not allowed"});}
  if(!authorized(req))return res.status(401).json({error:"Unauthorized"});
  if(!companyResearchProviderConfigured() && !Boolean(process.env.BRAVE_SEARCH_API_KEY))return res.status(503).json({status:"provider_not_configured",required:["BRAVE_SEARCH_API_KEY"]});
  // Keep each invocation small so a misconfigured cron/manual call cannot
  // consume the remaining Apollo credit balance in one shot.
  const limit=Math.max(1,Math.min(Number(req.query?.limit??req.body?.limit)||25,250));
  const batch=await getCompanyResearchBatch(limit);
  const report={requested:limit,available:batch.length,claimed:0,complete:0,noMatch:0,deferred:0,failed:0,results:[]};
  const concurrency=Math.max(1,Math.min(Number(process.env.COMPANY_RESEARCH_CONCURRENCY)||5,10));
  let cursor=0;
  async function processOne(item){
    const claimed=await claimCompanyResearch(item.queue.id);
    if(!claimed)return;
    report.claimed++;
    try{
      const result=await researchCompany(item.company);
      const saved=await saveCompanyResearch(item.company,{...item.queue,...claimed},result);
      if(saved.status==="complete")report.complete++;
      else if(saved.status==="deferred"){report.deferred++;report.results.push({companyId:item.company.company_id,name:item.company.company_name,status:"deferred",evidence:result.evidence||null});}
      else report.noMatch++;
    }catch(error){
      await failCompanyResearch({...item.queue,...claimed},error.message);
      report.failed++;
      report.results.push({companyId:item.company.company_id,name:item.company.company_name,status:"failed",error:error.message});
    }
  }
  async function worker(){
    while(cursor<batch.length){
      const item=batch[cursor++];
      await processOne(item);
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,batch.length)},()=>worker()));
  return res.status(200).json({status:"complete",...report});
}
