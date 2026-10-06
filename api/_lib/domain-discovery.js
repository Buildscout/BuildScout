function clean(v){return String(v==null?"":v).trim();}

function cleanCompanyName(value){
  let name=clean(value);
  // Permit feeds sometimes append address/phone/contact text to the company field.
  name=name.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g," ");
  name=name.replace(/\+?1?\s*\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g," ");
  name=name.replace(/\b\d{1,6}\s+[A-Z0-9][^,]{2,40},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi," ");
  name=name.replace(/\s+/g," ").replace(/[ ,;:-]+$/,"").trim();
  return name;
}

function normalizeDomain(value){
  const raw=clean(value);
  if(!raw)return null;
  try{
    const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
    if(!["http:","https:"].includes(url.protocol))return null;
    const host=url.hostname.replace(/^www\./i,"").toLowerCase();
    if(!host||/^(google|linkedin|facebook|yelp|mapquest)\./i.test(host))return null;
    return host;
  }catch{return null;}
}

function candidateDomain(result,companyName){
  const domain=normalizeDomain(result?.url);
  if(!domain)return null;
  const target=clean(companyName).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const words=target.split(" ").filter(x=>x.length>=4&&!["construction","company","services","service","inc","incorporated","corp","corporation","llc","pllc","ltd","limited","group"].includes(x));
  const blocked=["safer.fmcsa.dot.gov","manta.com","mapquest.com","yelp.com","yellowpages.com","bbb.org","facebook.com","linkedin.com","instagram.com"];
  if(blocked.some(h=>domain===h||domain.endsWith("."+h)))return null;
  const titleWords=clean(result?.title).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(Boolean);
  const descriptionWords=clean(result?.description).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(Boolean);
  const domainHay=domain.replace(/[^a-z0-9]+/g," ");
  const titleHits=words.filter(w=>titleWords.includes(w)).length;
  const descriptionHits=words.filter(w=>descriptionWords.includes(w)).length;
  const domainHits=words.filter(w=>domainHay.includes(w)).length;
  if(domainHits>=1&&titleHits>=1)return domain;
  if(titleHits>=2&&descriptionHits>=1&&!/\.gov$|\.mil$/i.test(domain))return domain;
  return null;
}

export function domainDiscoveryConfigured(){return Boolean(clean(process.env.BRAVE_SEARCH_API_KEY));}

export async function discoverCompanyDomain(company){
  const key=clean(process.env.BRAVE_SEARCH_API_KEY);
  if(!key)return{status:"needs_provider",domain:null,evidence:"No domain discovery provider is configured."};
  const name=cleanCompanyName(company.company_name);
  if(!name)return{status:"no_match",domain:null,evidence:"Company has no usable name."};
  const url=new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q",`${name} official website`);
  url.searchParams.set("count","10");
  const response=await fetch(url.toString(),{headers:{"X-Subscription-Token":key,"Accept":"application/json"}});
  if(response.status===401||response.status===403)return{status:"provider_error",domain:null,evidence:`Brave Search authentication/permission error (HTTP ${response.status}).`};
  if(response.status===429)return{status:"deferred",domain:null,evidence:"Brave Search rate limit reached."};
  if(!response.ok)return{status:"provider_error",domain:null,evidence:`Brave Search returned HTTP ${response.status}.`};
  const data=await response.json();
  for(const result of (Array.isArray(data?.web?.results)?data.web.results:[])){
    const domain=candidateDomain(result,name);
    if(domain)return{status:"matched",domain,evidence:`Brave Search found likely official domain "${domain}" for "${name}".`};
  }
  return{status:"no_match",domain:null,evidence:`No sufficiently supported official domain found for "${name}".`};
}
