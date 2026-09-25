import { getCompanyResearchBatch, claimCompanyResearch } from "./_lib/company-research.js";

function authorized(req){
  const expected=process.env.BUILDSCOUT_SECRET;
  return Boolean(expected)&&String(req.headers?.authorization||"")===`Bearer ${expected}`;
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!authorized(req))return res.status(401).json({error:"Unauthorized"});
  try{
    const batch=await getCompanyResearchBatch(req.body?.limit||25);
    const items=[];
    for(const item of batch){
      const claimed=await claimCompanyResearch(item.queue.id);
      if(!claimed)continue;
      items.push({
        queueId:item.queue.id,
        projectCompanyId:item.company.id,
        projectId:item.company.project_id,
        companyName:item.company.company_name,
        role:item.company.role,
        existingWebsite:item.company.website||null,
        existingPhone:item.company.phone||null,
        sourceId:item.company.source_id||null,
        confidence:item.company.confidence,
        priority:item.queue.priority
      });
    }
    return res.status(200).json({status:items.length?"ready":"idle",claimed:items.length,items});
  }catch(error){
    console.error("company research batch failed",error);
    return res.status(500).json({error:"Company research batch failed",detail:error.message});
  }
}
