function clean(v){return String(v==null?"":v).trim();}

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
  const words=target.split(" ").filter(x=>x.length>=4&&!["construction","company","services","service","inc","incorporated","corp","corporation","llc","pllc","ltd","limited"].includes(x));
  const hay=`${clean(result?.title)} ${clean(result?.description)} ${domain}`.toLowerCase().replace(/[^a-z0-9.]+/g," ");
  const hits=words.filter(w=>hay.includes(w)).length;
  return hits?domain:null;
}

export function domainDiscoveryConfigured(){return Boolean(clean(process.env.BRAVE_SEARCH_API_KEY));}

export async function discoverCompanyDomain(company){
  const key=clean(process.env.BRAVE_SEARCH_API_KEY);
  if(!key)return{status:"needs_provider",domain:null,evidence:"No domain discovery provider is configured."};
  const name=clean(company.company_name);
  if(!name)return{status:"no_match",domain:null,evidence:"Company has no usable name."};
  const url=new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q",`"${name}" official website`);
  url.searchParams.set("count","5");
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
