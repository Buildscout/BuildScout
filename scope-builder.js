(function(){
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const B=()=>window.BuildScoutBackend;
async function uid(){return (await B().getSession())?.user?.id||null;}
function close(){document.getElementById("bs-scope-modal")?.remove();}
const TEMPLATES={
"Sitework":["Earthwork & grading","Excavation","Utilities","Stormwater / drainage","Site concrete","Paving"],
"Concrete":["Foundations","Slab-on-grade","Elevated concrete","Reinforcing steel","Concrete finishes"],
"Structural Steel":["Structural steel","Miscellaneous metals","Metal stairs & railings"],
"Framing":["Wood framing","Cold-formed metal framing","Blocking & backing"],
"Drywall":["Gypsum board","Level 4/5 finish","Framing & backing"],
"Insulation":["Batt insulation","Rigid insulation","Spray foam","Firestopping"],
"Roofing":["Roofing membrane","Roof insulation","Sheet metal flashing","Roof accessories"],
"Siding":["Siding","Exterior trim","Soffit & fascia","Weather barrier"],
"Trim & Exterior Finish":["Exterior trim","Soffit & fascia","Caulking & sealants"],
"Windows & Doors":["Windows","Exterior doors","Storefront / curtain wall","Door hardware"],
"Painting":["Interior painting","Exterior painting","Coatings & specialty finishes"],
"Flooring":["Resilient flooring","Carpet","Tile","Polished concrete"],
"Cabinetry & Millwork":["Casework","Architectural millwork","Countertops"],
"Electrical":["Power distribution","Lighting","Low-voltage pathways"],
"Low Voltage":["Data / communications","Access control","CCTV"],
"Fire Alarm":["Fire alarm","Detection devices","Emergency communications"],
"Security":["Access control","CCTV / security","Intercom"],
"Plumbing":["Domestic water","Sanitary / waste","Storm plumbing","Fixtures"],
"HVAC":["HVAC equipment","Ductwork","Controls","Testing & balancing"],
"Fire Protection":["Sprinkler system","Standpipe","Fire pump"],
"Solar":["PV array","Inverters","Racking & balance of system"],
"Landscaping":["Planting","Irrigation","Site furnishings"],
"Irrigation":["Irrigation system","Controls"],
"Pool & Spa":["Pool structure","Pool equipment","Pool finishes"],
"Demolition":["Selective demolition","Site demolition","Hazardous material coordination"],
"Fencing":["Perimeter fencing","Gates"],
"Paving":["Asphalt paving","Concrete paving","Striping & signage"]
};
async function open(projectId,projectName){
 const u=await uid();if(!u){alert("Please sign in again.");return;}
 const c=B().getClient()||B().init();
 const [p,pk]=await Promise.all([
  c.from("project_scope_packages").select("*").eq("project_id",projectId).order("sort_order"),
  c.from("project_trade_packages").select("trade,scope_summary").eq("project_id",projectId).order("trade")
 ]);
 if(p.error||pk.error){alert((p.error||pk.error).message);return;}
 close();
 const packages=p.data||[], trades=pk.data||[];
 document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="bs-scope-modal"><div class="modalbox bs-scope-modal"><button class="close" onclick="BuildScoutScope.close()">×</button><div class="bs-eyebrow">BUILDSCOUT SCOPE BUILDER</div><h2>'+esc(projectName||"Project")+'</h2><p class="muted">Turn broad bid packages into precise, reviewable scopes. Nothing is treated as verified until the project team approves it.</p><div class="bs-scope-toolbar"><button class="btn primary" onclick="BuildScoutScope.recommend('+JSON.stringify(projectId)+')">Build recommended scopes</button><button class="btn secondary" onclick="BuildScoutScope.refresh('+JSON.stringify(projectId)+','+JSON.stringify(projectName||"Project")+')">Refresh</button></div><div id="bs-scope-status" class="muted"></div><div id="bs-scope-list">'+renderPackages(packages)+'</div></div></div>');
}
function renderPackages(a){
 if(!a.length)return '<div class="panel"><h3>No scope packages yet</h3><p class="muted">BuildScout can expand the project\'s trade packages into reviewable scope packages.</p></div>';
 return a.map(p=>'<div class="panel bs-scope-card"><div class="bs-scope-card-head"><div><span class="tag">'+esc(p.csi_division||"Trade")+'</span><h3>'+esc(p.name)+'</h3><div class="muted">'+esc(p.trade)+' · '+esc(p.ai_status||"draft")+'</div></div><div class="bs-confidence">'+(p.ai_confidence!=null?Math.round(p.ai_confidence*100)+"% confidence":"Review required")+'</div></div><p>'+esc(p.description||"No description yet.")+'</p><div class="bs-scope-grid"><div><b>Included</b><span>'+esc(p.scope_included||"Not defined")+'</span></div><div><b>Exclusions</b><span>'+esc(p.exclusions||"Not defined")+'</span></div></div></div>').join("");
}
async function recommend(projectId){
 const c=B().getClient()||B().init(),status=document.getElementById("bs-scope-status");
 if(status)status.textContent="Building reviewable scope packages…";
 const pk=await c.from("project_trade_packages").select("trade,scope_summary").eq("project_id",projectId).order("trade");
 if(pk.error){if(status)status.textContent=pk.error.message;return;}
 const existing=await c.from("project_scope_packages").select("name,trade").eq("project_id",projectId);
 if(existing.error){if(status)status.textContent=existing.error.message;return;}
 const seen=new Set((existing.data||[]).map(x=>x.trade+"|"+x.name));
 const rows=[];(pk.data||[]).forEach(t=>(TEMPLATES[t.trade]||[t.trade]).forEach((name,i)=>{if(!seen.has(t.trade+"|"+name))rows.push({project_id:projectId,name,csi_division:csiFor(t.trade),trade:t.trade,description:"Reviewable scope package derived from the "+t.trade+" bid package.",scope_included:t.scope_summary||null,ai_status:"needs_review",ai_confidence:null,sort_order:i,created_by:null});}));
 if(!rows.length){if(status)status.textContent="No new packages needed.";return;}
 const u=await uid();rows.forEach(x=>x.created_by=u);
 const ins=await c.from("project_scope_packages").insert(rows);
 if(ins.error){if(status)status.textContent=ins.error.message;return;}
 await refresh(projectId,document.querySelector("#bs-scope-modal h2")?.textContent||"Project");
}
function csiFor(t){const map={"Sitework":"31","Concrete":"03","Structural Steel":"05","Framing":"06","Drywall":"09","Insulation":"07","Roofing":"07","Siding":"07","Trim & Exterior Finish":"07","Windows & Doors":"08","Painting":"09","Flooring":"09","Cabinetry & Millwork":"12","Electrical":"26","Low Voltage":"27","Fire Alarm":"28","Security":"28","Plumbing":"22","HVAC":"23","Fire Protection":"21","Solar":"26","Landscaping":"32","Irrigation":"32","Pool & Spa":"13","Demolition":"02","Fencing":"32","Paving":"32"};return map[t]||"";}
async function refresh(id,name){open(id,name);}
window.BuildScoutScope={open,close,recommend,refresh};
})();