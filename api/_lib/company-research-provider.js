import { discoverCompanyDomain, domainDiscoveryConfigured } from "./domain-discovery.js";

function clean(v){return String(v==null?"":v).trim();}
function normalizedName(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
const LEGAL_SUFFIXES=new Set(["llc","inc","incorporated","corp","corporation","co","company","ltd","limited","lp","llp","pllc"]);
function identityTokens(v){return normalizedName(v).split(" ").filter(Boolean).filter(x=>!LEGAL_SUFFIXES.has(x));}
function tokenEditDistance(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const curr=[i];for(let j=1;j<=b.length;j++)curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<curr.length;j++)prev[j]=curr[j];}return prev[b.length];}
function namesAgree(requested,returned){const a=identityTokens(requested),b=identityTokens(returned);if(!a.length||!b.length||a.length!==b.length)return false;const used=new Set();let fuzzyMatches=0;for(const token of a){const exactIndex=b.findIndex((candidate,index)=>!used.has(index)&&candidate===token);if(exactIndex>=0){used.add(exactIndex);continue;}const fuzzyIndex=b.findIndex((candidate,index)=>!used.has(index)&&token.length>=5&&candidate.length>=5&&tokenEditDistance(token,candidate)<=1);if(fuzzyIndex<0)return false;used.add(fuzzyIndex);fuzzyMatches++;if(fuzzyMatches>1)return false;}return true;}
function normalizeWebsite(value){const raw=clean(value);if(!raw)return null;try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return url.protocol==="http:"||url.protocol==="https:"?url.toString():null;}catch{return null;}}
function organizationDomain(org){const raw=clean(org?.primary_domain||org?.domain||org?.website_url);if(!raw)return null;try{return new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`).hostname.replace(/^www\./i,"").toLowerCase();}catch{return null;}}

async function enrichByDomain(key,company){
  const domain=organizationDomain({primary_domain:company.website});
  if(!domain)return{configured:true,status:"needs_domain",website:null,phone:null,evidence:"No verified domain available for Apollo enrichment."};
  const response=await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,{
    method:"GET",headers:{"X-Api-Key":key,accept:"application/json","Content-Type":"application/json"}
  });
  if(response.status===404)return{configured:true,status:"no_match",website:company.website,phone:null,provider:"brave",evidence:`Domain "${domain}" was discovered, but Apollo has no matching organization record.`};
  if(response.status===403)return{configured:true,status:"deferred",website:company.website,phone:null,evidence:"Apollo organization enrichment is not enabled for the configured API key (HTTP 403)."};
  if(response.status===422)return{configured:true,status:"matched",website:company.website,phone:null,provider:"brave",providerRecordId:null,evidence:`Verified website "${company.website}" discovered; Apollo could not enrich this domain (HTTP 422), so the website was retained without Apollo enrichment.`};
  if(response.status===429)return{configured:true,status:"matched",website:company.website,phone:null,provider:"brave",providerRecordId:null,evidence:`Verified website "${company.website}" discovered; Apollo rate limit was reached (HTTP 429), so the website was retained without Apollo enrichment.`};
  if(!response.ok)throw new Error(`Apollo organization enrichment returned HTTP ${response.status}`);
  const data=await response.json(),org=data?.organization||null;
  if(!org)return{configured:true,status:"no_match",website:company.website,phone:null,provider:"brave",evidence:`Domain "${domain}" was discovered, but Apollo returned no organization.`};
  const returnedName=clean(org.name);
  if(!namesAgree(company.company_name,returnedName)){
    return{configured:true,status:"no_match",website:company.website,phone:null,provider:"brave",evidence:`Domain "${domain}" did not safely match source company "${company.company_name}" through Apollo organization "${returnedName||"unknown"}".`};
  }
  const website=normalizeWebsite(org.website_url)||company.website;
  const phone=clean(org.primary_phone?.number||org.phone)||null;
  const evidence=clean(org.id)?`Apollo organization ${org.id}; matched "${returnedName}" via verified domain ${domain}`:`Apollo organization; matched "${returnedName}" via verified domain ${domain}`;
  return{configured:true,status:website||phone?"matched":"no_match",website,phone,evidence,provider:"apollo",providerRecordId:clean(org.id)||null,matchedName:returnedName};
}

export function companyResearchProviderConfigured(){return Boolean(clean(process.env.APOLLO_API_KEY));}

export async function researchCompany(company){
  let website=clean(company.website);
  if(!website){
    if(!domainDiscoveryConfigured())return{configured:Boolean(clean(process.env.APOLLO_API_KEY)),status:"needs_domain",website:null,phone:null,evidence:"Deferred: no verified company domain is available and no domain discovery provider is configured."};
    const discovery=await discoverCompanyDomain(company);
    if(discovery.status!=="matched")return{configured:Boolean(clean(process.env.APOLLO_API_KEY)),status:discovery.status==="provider_error"?"deferred":"needs_domain",website:null,phone:null,evidence:discovery.evidence};
    website=`https://${discovery.domain}`;
  }
  const key=clean(process.env.APOLLO_API_KEY);
  if(!key)return{configured:true,status:"matched",website,phone:null,provider:"brave",providerRecordId:null,evidence:`Verified website "${website}" discovered; Apollo enrichment is unavailable, so the verified website was saved without paid enrichment.`};
  const enriched=await enrichByDomain(key,{...company,website});
  // Brave independently verified the domain. Apollo is supplemental: a missing
  // or non-matching Apollo organization must not erase a valid free website.
  if(enriched.status==="no_match" && website){
    return{configured:true,status:"matched",website,phone:null,provider:"brave",providerRecordId:null,evidence:`Verified website "${website}" discovered; Apollo did not provide a safe organization match, so the website was retained without Apollo enrichment.`};
  }
  return enriched;
}