import { getCompanyResearchBatch, claimCompanyResearch, saveCompanyResearch, failCompanyResearch } from "./_lib/company-research.js";
import { companyResearchProviderConfigured, researchCompany } from "./_lib/company-research-provider.js";

function bearer(req){const h=String(req.headers?.authorization||"");return h.startsWith("Bearer ")?h.slice(7).trim():"";}
function authorized(req){
  const token=bearer(req);
  const allowed=[process.env.CRON_SECRET,process.env.BUILDSCOUT_SYNC_SECRET].filter(Boolean);
  return allowed.length>0&&allowed.includes(token);
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!authorized(req))return res.status(401).json({error:"Unauthorized"});
  if(!companyResearchProviderConfigured())return res.status(503).json({status:"provider_not_configured",required:["APOLLO_API_KEY"]});
  const limit=Math.max(1,Math.min(Number(req.body?.limit)||10,25));
  const batch=await getCompanyResearchBatch(limit);
  const report={requested:limit,available:batch.length,claimed:0,complete:0,noMatch:0,failed:0};
  for(const item of batch){
    const claimed=await claimCompanyResearch(item.queue.id);
    if(!claimed)continue;
    report.claimed++;
    try{
      const result=await researchCompany(item.company);
      const saved=await saveCompanyResearch(item.company,{...item.queue,...claimed},result);
      if(saved.status==="complete")report.complete++;else report.noMatch++;
    }catch(error){
      await failCompanyResearch({...item.queue,...claimed},error.message);
      report.failed++;
    }
  }
  return res.status(200).json({status:"complete",...report});
}
