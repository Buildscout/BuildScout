export const SEATTLE_SOURCE = {
  id: "seattle-building-permits",
  name: "City of Seattle — Building Permits",
  authority: "Seattle Department of Construction and Inspections",
  jurisdiction: "Seattle, WA",
  datasetId: "76t5-zqzr",
  apiUrl: "https://data.seattle.gov/resource/76t5-zqzr.json",
  portalUrl: "https://data.seattle.gov/d/76t5-zqzr"
};

function clean(v){ return String(v == null ? "" : v).trim(); }
function first(r, keys){ for (const k of keys){ const v=clean(r?.[k]); if(v) return v; } return ""; }
function numberOrNull(v){ const n=Number(clean(v).replace(/[$,]/g,"")); return Number.isFinite(n) ? n : null; }

export function normalizeSeattleRecord(r, checkedAt=new Date().toISOString()){
  const permit=first(r,["permitnum"]);
  if(!permit) return {rejected:true,reason:"missing permit identifier"};
  const description=first(r,["description"]);
  const type=first(r,["permittypemapped","permittypedesc","permitclassmapped","permitclass"]) || "Construction";
  const address=first(r,["originaladdress1"]);
  return {rejected:false,project:{
    name: description || (address ? `${type} — ${address}` : `Seattle permit ${permit}`),
    city: [first(r,["originalcity"])||"Seattle", first(r,["originalstate"])||"WA"].join(", "),
    street_address: address || null,
    zip_code: first(r,["originalzip"]) || null,
    latitude: numberOrNull(first(r,["latitude"])),
    longitude: numberOrNull(first(r,["longitude"])),
    project_type: type,
    stage: first(r,["statuscurrent","status_current"]) || (first(r,["issueddate"]) ? "Issued" : "In review"),
    estimated_value: numberOrNull(first(r,["estprojectcost"])),
    opportunity_score: 70,
    units: numberOrNull(first(r,["housingunits"])),
    expected_start: first(r,["issueddate","applieddate"]) || null,
    general_contractor: null,
    permit_number: permit,
    source_name: SEATTLE_SOURCE.name,
    source_url: SEATTLE_SOURCE.portalUrl,
    last_verified: String(checkedAt).slice(0,10)
  }};
}

export async function fetchSeattleRecords({maxRecords=1000,pageSize=500}={}){
  const max=Math.max(1,Math.min(Number(maxRecords)||1000,5000));
  const size=Math.max(25,Math.min(Number(pageSize)||500,1000));
  const checkedAt=new Date().toISOString();
  const raw=[];
  for(let offset=0;offset<max;offset+=size){
    const take=Math.min(size,max-offset);
    const params=new URLSearchParams({"$limit":String(take),"$offset":String(offset),"$order":"issueddate DESC"});
    const response=await fetch(`${SEATTLE_SOURCE.apiUrl}?${params}`);
    if(!response.ok) throw new Error(`Seattle permit feed returned HTTP ${response.status}.`);
    const page=await response.json(); raw.push(...page); if(page.length<take) break;
  }
  const projects=[],seen=new Set(); let rejected=0,duplicates=0;
  for(const r of raw){
    const n=normalizeSeattleRecord(r,checkedAt);
    if(n.rejected){rejected++;continue;}
    const key=n.project.permit_number;
    if(seen.has(key)){duplicates++;continue;}
    seen.add(key);projects.push(n.project);
  }
  return {source:SEATTLE_SOURCE,fetched:raw.length,eligible:projects.length,rejected,duplicates,projects};
}
