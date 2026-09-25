function clean(v){return String(v==null?"":v).trim();}

export function companyResearchProviderConfigured(){
  return Boolean(clean(process.env.APOLLO_API_KEY));
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
  const key=clean(process.env.APOLLO_API_KEY);
  if(!key)return{configured:false,status:"not_configured"};
  const params=new URLSearchParams({name:company.company_name});
  const response=await fetch(`https://api.apollo.io/api/v1/organizations/enrich?${params.toString()}`,{
    method:"GET",
    headers:{"X-Api-Key":key,accept:"application/json","Content-Type":"application/json"}
  });
  if(response.status===404)return{configured:true,status:"no_match",website:null,phone:null,evidence:null};
  if(!response.ok)throw new Error(`Apollo organization enrichment returned HTTP ${response.status}`);
  const data=await response.json();
  const org=data?.organization||null;
  if(!org)return{configured:true,status:"no_match",website:null,phone:null,evidence:null};
  const website=normalizeWebsite(org.website_url);
  const phone=clean(org.primary_phone?.number||org.phone)||null;
  const evidence=clean(org.id)?`Apollo organization ${org.id}`:"Apollo organization enrichment";
  return{configured:true,status:website||phone?"matched":"no_match",website,phone,evidence};
}
