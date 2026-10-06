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
    if(!host||/^(google|linkedin|facebook|yelp|mapquest|nextdoor|buzzfile|dnb|crunchbase)\./i.test(host))return null;
    return host;
  }catch{return null;}
}

function candidateDomain(result,companyName){
  const domain=normalizeDomain(result?.url);
  if(!domain)return null;
  const target=clean(companyName).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const words=target.split(" ").filter(x=>x.length>=4&&!["construction","company","services","service","inc","incorporated","corp","corporation","llc","pllc","ltd","limited","group"].includes(x));
  const blocked=["safer.fmcsa.dot.gov","manta.com","mapquest.com","yelp.com","yellowpages.com","bbb.org","facebook.com","linkedin.com","instagram.com","nextdoor.com","buzzfile.com","chamberofcommerce.com","dnb.com","crunchbase.com"];
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

function candidateDomains(companyName){
  const cleaned=cleanCompanyName(companyName).toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\b(llc|inc|incorporated|corp|corporation|co|company|ltd|limited|lp|llp|pllc|group|services|service)\b/g," ")
    .replace(/\s+/g," ").trim();
  const words=cleaned.split(" ").filter(Boolean);
  if(!words.length)return[];
  const joined=words.join("");
  const dashed=words.join("-");
  const compact=words.slice(0,5).join("");
  const short=words.slice(0,4).join("");
  // Keep the free fallback bounded: only probe the most plausible domains
  // so a 250-company batch cannot turn into thousands of outbound requests.
  const bases=[joined,dashed,compact,short];
  return [...new Set(bases.map(b=>b+".com"))];
}

async function probeDomain(domain){
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),3500);
    const response=await fetch("https://"+domain,{method:"GET",redirect:"follow",signal:controller.signal,headers:{"user-agent":"BuildScoutBot/1.0"}});
    clearTimeout(timer);
    if(!response.ok)return null;
    const type=String(response.headers.get("content-type")||"").toLowerCase();
    if(type&&!type.includes("text/html"))return null;
    const html=(await response.text()).slice(0,500000);
    const title=(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||"")
      .replace(/<[^>]+>/g," ").replace(/&[^;]+;/g," ").replace(/\\s+/g," ").trim();
    return{domain,title};
  }catch{return null;}
}

function titleSupportsCompany(title,companyName){
  const wanted=cleanCompanyName(companyName).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const words=wanted.split(" ").filter(w=>w.length>=4&&!["construction","company","services","service","inc","incorporated","corp","corporation","llc","pllc","limited","group","heating","cooling","electrical","plumbing"].includes(w));
  const hay=title.toLowerCase().replace(/[^a-z0-9]+/g," ");
  if(!words.length)return false;
  const hits=words.filter(w=>hay.includes(w)).length;
  return hits>=Math.min(2,words.length);
}

export function domainDiscoveryConfigured(){
  // Free direct-domain probing works without a paid search API. Brave remains
  // optional when a key is present, but is no longer required.
  return true;
}

export async function discoverCompanyDomain(company){
  const key=clean(process.env.BRAVE_SEARCH_API_KEY);
  if(!name)return{status:"no_match",domain:null,evidence:"Company has no usable name."};
  const name=cleanCompanyName(company.company_name);
  if(!name)return{status:"no_match",domain:null,evidence:"Company has no usable name."};
  // Prefer Brave when available; if it is unavailable, fall back to free
  // direct-domain probing. A domain is only accepted when the live site responds
  // and its title supports the source company name.
  if(key){
    try{
      const url=new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q",`${name} official website`);
      url.searchParams.set("count","10");
      const response=await fetch(url.toString(),{headers:{"X-Subscription-Token":key,"Accept":"application/json"}});
      if(response.ok){
        const data=await response.json();
        for(const result of (Array.isArray(data?.web?.results)?data.web.results:[])){
          const domain=candidateDomain(result,name);
          if(domain)return{status:"matched",domain,evidence:`Brave Search found likely official domain "${domain}" for "${name}".`};
        }
      }
    }catch{}
  }
  for(const candidate of candidateDomains(name)){
    const domain=candidate.replace(/^www\\./i,"");
    const probe=await probeDomain(domain);
    if(probe && titleSupportsCompany(probe.title,name)){
      return{status:"matched",domain,evidence:`Free direct-domain verification found live site "${domain}" with supporting title "${probe.title}".`};
    }
  }
  return{status:"no_match",domain:null,evidence:`No sufficiently supported official domain found for "${name}" using free discovery.`};
}
