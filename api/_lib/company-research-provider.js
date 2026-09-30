function clean(v){return String(v==null?"":v).trim();}
function normalizedName(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
const LEGAL_SUFFIXES=new Set(["llc","inc","incorporated","corp","corporation","co","company","ltd","limited","lp","llp","pllc"]);
function identityTokens(v){return normalizedName(v).split(" ").filter(Boolean).filter(x=>!LEGAL_SUFFIXES.has(x));}
function namesAgree(requested,returned){
  const a=identityTokens(requested),b=identityTokens(returned);
  if(!a.length||!b.length)return false;
  if(a.join(" ")===b.join(" "))return true;
  const as=new Set(a),bs=new Set(b),shared=[...as].filter(x=>bs.has(x));
  const coverage=shared.length/Math.max(as.size,bs.size);
  return shared.length>=2&&coverage>=0.8;
}

export function companyResearchProviderConfigured(){return Boolean(clean(process.env.APOLLO_API_KEY));}

function normalizeWebsite(value){
  const raw=clean(value);if(!raw)return null;
  try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return url.protocol==="http:"||url.protocol==="https:"?url.toString():null;}catch{return null;}
}

export async function researchCompany(company){
  const key=clean(process.env.APOLLO_API_KEY);
  if(!key)return{configured:false,status:"not_configured"};
  const params=new URLSearchParams({name:company.company_name});
  if(company.website)params.set("website",company.website);
  const response=await fetch(`https://api.apollo.io/api/v1/organizations/enrich?${params.toString()}`,{
    method:"GET",headers:{"X-Api-Key":key,accept:"application/json","Content-Type":"application/json"}
  });
  if(response.status===404)return{configured:true,status:"no_match",website:null,phone:null,evidence:null};
  if(!response.ok)throw new Error(`Apollo organization enrichment returned HTTP ${response.status}`);
  const data=await response.json(),org=data?.organization||null;
  if(!org)return{configured:true,status:"no_match",website:null,phone:null,evidence:null};
  const returnedName=clean(org.name);
  if(!namesAgree(company.company_name,returnedName)){
    return{configured:true,status:"rejected_match",website:null,phone:null,evidence:`Rejected Apollo organization ${clean(org.id)||"unknown"}: returned name "${returnedName||"unknown"}" did not safely match source company "${company.company_name}".`};
  }
  const website=normalizeWebsite(org.website_url),phone=clean(org.primary_phone?.number||org.phone)||null;
  const evidence=clean(org.id)?`Apollo organization ${org.id}; matched "${returnedName}"`:`Apollo organization enrichment; matched "${returnedName}"`;
  return{configured:true,status:website||phone?"matched":"no_match",website,phone,evidence,providerRecordId:clean(org.id)||null,matchedName:returnedName};
}
