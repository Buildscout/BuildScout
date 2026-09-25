function clean(v){return String(v==null?"":v).trim();}

export function companyResearchProviderConfigured(){
  return Boolean(clean(process.env.COMPANY_ENRICHMENT_API_URL)&&clean(process.env.COMPANY_ENRICHMENT_API_KEY));
}

function normalizeWebsite(value){
  const raw=clean(value);
  if(!raw)return null;
  try{
    const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
    return url.protocol==="http:"||url.protocol==="https:"?url.toString():null;
  }catch{return null;}
}

export async function researchCompany(company){
  const base=clean(process.env.COMPANY_ENRICHMENT_API_URL).replace(/\/$/,"");
  const key=clean(process.env.COMPANY_ENRICHMENT_API_KEY);
  if(!base||!key)return{configured:false,status:"not_configured"};

  const response=await fetch(base,{
    method:"POST",
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({company_name:company.company_name,project_id:company.project_id,role:company.role})
  });
  if(!response.ok)throw new Error(`Company enrichment provider returned HTTP ${response.status}`);
  const data=await response.json();
  const website=normalizeWebsite(data.website||data.domain);
  const phone=clean(data.phone)||null;
  const evidence=clean(data.source_url||data.evidence_url||data.provider_record_url);
  if((website||phone)&&!evidence)throw new Error("Provider returned company facts without source evidence.");
  return{configured:true,status:website||phone?"matched":"no_match",website,phone,evidence:evidence||null};
}
