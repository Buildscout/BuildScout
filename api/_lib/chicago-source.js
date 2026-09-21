export const CHICAGO_SOURCE = {
  id: "chicago-building-permits",
  name: "City of Chicago — Building Permits",
  authority: "City of Chicago Department of Buildings",
  jurisdiction: "Chicago, IL",
  datasetId: "ydr8-5enu",
  apiUrl: "https://data.cityofchicago.org/resource/ydr8-5enu.json",
  portalUrl: "https://data.cityofchicago.org/d/ydr8-5enu"
};

function clean(v){ return String(v == null ? "" : v).trim(); }
function first(r,keys){ for(const k of keys){ const v=clean(r?.[k]); if(v) return v; } return ""; }
function numberOrNull(v){ const n=Number(clean(v).replace(/[$,]/g,"")); return Number.isFinite(n)?n:null; }

function generalContractor(r){
  for(let i=1;i<=15;i++){
    const role=clean(r?.[`contact_${i}_type`]).toUpperCase();
    const name=clean(r?.[`contact_${i}_name`]);
    if(name && (role.includes("GENERAL CONTRACTOR") || role==="OWNER AS GENERAL CONTRACTOR")) return name;
  }
  return "";
}

export function normalizeChicagoRecord(r,checkedAt=new Date().toISOString()){
  // Chicago documents ID as the unique database-record identifier. PERMIT# is a
  // tracking number and can repeat, so BuildScout uses ID as its stable source key.
  const sourceId=first(r,["id"]);
  if(!sourceId) return {rejected:true,reason:"missing unique source id"};
  const displayPermit=first(r,["permit_"]);
  const street=[first(r,["street_number"]),first(r,["street_direction"]),first(r,["street_name"]),first(r,["suffix"])].filter(Boolean).join(" ");
  const type=first(r,["permit_type","work_description"])||"Construction";
  return {rejected:false,project:{
    name:street?`${type} — ${street}`:`Chicago permit ${displayPermit||sourceId}`,
    city:"Chicago, IL",street_address:street||null,zip_code:first(r,["zip_code"])||null,
    latitude:numberOrNull(first(r,["latitude"])),longitude:numberOrNull(first(r,["longitude"])),
    project_type:type,stage:"Issued",estimated_value:numberOrNull(first(r,["reported_cost","estimated_cost"])),
    opportunity_score:70,units:null,expected_start:first(r,["issue_date"])||null,
    general_contractor:generalContractor(r)||null,
    permit_number:sourceId,source_name:CHICAGO_SOURCE.name,source_url:CHICAGO_SOURCE.portalUrl,
    last_verified:String(checkedAt).slice(0,10)
  }};
}

export async function fetchChicagoRecords({maxRecords=1000,pageSize=500}={}){
  const max=Math.max(1,Math.min(Number(maxRecords)||1000,5000));
  const size=Math.max(25,Math.min(Number(pageSize)||500,1000));
  const checkedAt=new Date().toISOString(),raw=[];
  for(let offset=0;offset<max;offset+=size){
    const take=Math.min(size,max-offset);
    // ID is the deterministic tie-breaker when many permits share an issue date.
    const params=new URLSearchParams({"$limit":String(take),"$offset":String(offset),"$order":"issue_date DESC, id DESC"});
    const response=await fetch(`${CHICAGO_SOURCE.apiUrl}?${params}`);
    if(!response.ok) throw new Error(`Chicago permit feed returned HTTP ${response.status}.`);
    const page=await response.json();raw.push(...page);if(page.length<take)break;
  }
  const projects=[],seen=new Set();let rejected=0,duplicates=0;
  for(const r of raw){
    const n=normalizeChicagoRecord(r,checkedAt);
    if(n.rejected){rejected++;continue;}
    const key=n.project.permit_number;
    if(seen.has(key)){duplicates++;continue;}
    seen.add(key);projects.push(n.project);
  }
  return {source:CHICAGO_SOURCE,fetched:raw.length,eligible:projects.length,rejected,duplicates,projects};
}
