
const CFG=window.BUILDSCOUT_CONFIG, DEMO=window.BUILDSCOUT_DEMO_PROJECTS;
let imported=JSON.parse(localStorage.getItem("bs_imported")||"[]"); 
let saved=JSON.parse(localStorage.getItem("bs_saved")||"[]");
let pipeline=JSON.parse(localStorage.getItem("bs_pipeline")||"{}");
let projects = [];

let currentSession = null;
let authMode = "signin";

function renderAuthScreen(message = "") {
  const root = document.getElementById("app");
  const isSignup = authMode === "signup";

  root.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#08131d;
      padding:24px;
      box-sizing:border-box;
      font-family:Arial,sans-serif;
    ">
      <div style="
        width:100%;
        max-width:440px;
        background:#10202c;
        border:1px solid #29404f;
        border-radius:16px;
        padding:36px;
        box-sizing:border-box;
        box-shadow:0 20px 60px rgba(0,0,0,.35);
      ">

        <div style="
          font-size:30px;
          font-weight:800;
          color:white;
          margin-bottom:8px;
        ">
          BUILD<span style="color:#ff9f32;">SCOUT</span>
        </div>

        <div style="
          color:#9fb1bd;
          margin-bottom:28px;
          font-size:15px;
        ">
          Construction intelligence for the people who build.
        </div>

        <h2 style="
          color:white;
          margin:0 0 8px;
          font-size:24px;
        ">
          ${isSignup ? "Create your account" : "Welcome back"}
        </h2>

        <p style="
          color:#9fb1bd;
          margin:0 0 24px;
          line-height:1.5;
        ">
          ${
            isSignup
              ? "Create your BuildScout account to start finding construction opportunities."
              : "Sign in to access your BuildScout dashboard."
          }
        </p>

        ${
          isSignup
            ? `
              <div style="display:flex;gap:12px;">
                <input
                  id="authFirstName"
                  type="text"
                  placeholder="First name"
                  autocomplete="given-name"
                  style="${authInputStyle()}"
                />

                <input
                  id="authLastName"
                  type="text"
                  placeholder="Last name"
                  autocomplete="family-name"
                  style="${authInputStyle()}"
                />
              </div>
            `
            : ""
        }

        <input
          id="authEmail"
          type="email"
          placeholder="Email address"
          autocomplete="email"
          style="${authInputStyle()}"
        />

        <input
          id="authPassword"
          type="password"
          placeholder="Password"
          autocomplete="${isSignup ? "new-password" : "current-password"}"
          style="${authInputStyle()}"
        />

        ${
          message
            ? `
              <div style="
                background:#172b38;
                border:1px solid #385365;
                color:#d8e4ea;
                padding:12px;
                border-radius:8px;
                margin-bottom:16px;
                font-size:14px;
                line-height:1.4;
              ">
                ${escapeAuthText(message)}
              </div>
            `
            : ""
        }

        <button
          id="authSubmit"
          type="button"
          style="
            width:100%;
            border:0;
            background:#ff9f32;
            color:#08131d;
            font-weight:800;
            padding:14px 18px;
            border-radius:9px;
            cursor:pointer;
            font-size:16px;
          "
        >
          ${isSignup ? "Create account" : "Sign in"}
        </button>

        <div style="
          text-align:center;
          margin-top:22px;
          color:#9fb1bd;
          font-size:14px;
        ">
          ${isSignup ? "Already have an account?" : "New to BuildScout?"}

          <button
            id="authSwitch"
            type="button"
            style="
              background:none;
              border:0;
              color:#ff9f32;
              cursor:pointer;
              font-weight:700;
              font-size:14px;
            "
          >
            ${isSignup ? "Sign in" : "Create account"}
          </button>
        </div>

      </div>
    </div>
  `;

  document
    .getElementById("authSubmit")
    .addEventListener("click", handleAuthSubmit);

  document
    .getElementById("authSwitch")
    .addEventListener("click", () => {
      authMode = isSignup ? "signin" : "signup";
      renderAuthScreen();
    });

  document
    .getElementById("authPassword")
    .addEventListener("keydown", event => {
      if (event.key === "Enter") {
        handleAuthSubmit();
      }
    });
}

function authInputStyle() {
  return `
    width:100%;
    box-sizing:border-box;
    background:#08131d;
    border:1px solid #38505f;
    color:white;
    padding:13px 14px;
    border-radius:8px;
    margin-bottom:14px;
    outline:none;
    font-size:15px;
  `;
}

function escapeAuthText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function handleAuthSubmit() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    renderAuthScreen("Enter your email and password.");
    return;
  }

  if (password.length < 6) {
    renderAuthScreen("Password must be at least 6 characters.");
    return;
  }

  try {
    if (authMode === "signup") {
      const firstName = document
        .getElementById("authFirstName")
        .value.trim();

      const lastName = document
        .getElementById("authLastName")
        .value.trim();

      if (!firstName || !lastName) {
        renderAuthScreen("Enter your first and last name.");
        return;
      }

      await BuildScoutBackend.signUp(
        email,
        password,
        firstName,
        lastName
      );

      authMode = "signin";

      renderAuthScreen(
        "Account created. Check your email to verify your address, then return here and sign in."
      );

      return;
    }

    await BuildScoutBackend.signIn(email, password);

    currentSession = await BuildScoutBackend.getSession();

    if (!currentSession) {
      renderAuthScreen(
        "Please verify your email address before signing in."
      );
      return;
    }

    await startBuildScout();

  } catch (error) {
    console.error("Authentication failed:", error);

    renderAuthScreen(
      error.message || "Authentication failed. Please try again."
    );
  }
}

async function startBuildScout() {
  currentSession = await BuildScoutBackend.getSession();

  if (!currentSession) {
    renderAuthScreen();
    return;
  }

  await loadSupabaseProjects();
}

async function bootBuildScout() {
  try {
    currentSession = await BuildScoutBackend.getSession();

    if (!currentSession) {
      renderAuthScreen();
      return;
    }

    await startBuildScout();

  } catch (error) {
    console.error("BuildScout startup failed:", error);

    renderAuthScreen(
      "Unable to start BuildScout. Please refresh the page and try again."
    );
  }
}
function isDisplayLead(p) {
  const name = String(p.name || "").toLowerCase();
  const value = Number(p.estimated_value || 0);

  if (!name.trim() || name === "null") return false;

  const junkTerms = [
    "sign",
    "water heater",
    "sprinkler",
    "service upgrade",
    "electrical service",
    "generator",
    "condenser",
    "hvac replacement",
    "install new hvac",
    "air conditioner",
    "plumbing repair",
    "roof repair",
    "roof replacement",
    "reroof",
    "re-roof",
    "remove existing roof",
    "fence",
    "access control",
    "maglock",
    "door access",
    "sewer relay",
    "sewer repair",
    "swimming pool",
    "fireline",
"general repair",
"repair work only",
"no structural changes",
"plumbing",
"electrical repair"
  ];

  const isJunk = junkTerms.some(term => name.includes(term));

  if (isJunk && value < 750000) {
    return false;
  }

  return true;
}
async function loadSupabaseProjects() {
  try {
    const rows = await BuildScoutBackend.getProjects();

    const supabaseProjects = rows
  .filter(isDisplayLead)
  .map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      lat: p.latitude,
      lon: p.longitude,
      type: p.project_type,
      stage: p.stage,
      value: Number(p.estimated_value || 0),
      units: p.units,
      permit_number: p.permit_number,
      source: p.source_name,
      score: p.opportunity_score || 70,
      developer: p.developer,
      gc: p.general_contractor,
      street_address: p.street_address,
      zip_code: p.zip_code
    }));

    projects = [...supabaseProjects];

    shell();
    renderPage();

    console.log("Loaded Supabase projects:", supabaseProjects.length);
  } catch (error) {
    console.error("Failed to load Supabase projects:", error);
  }
}
let page="dashboard", query="", selectedType="All", selectedStage="All", minValue=0;
let map, markerLayer;
const app=document.getElementById("app");

function persist(){
  localStorage.setItem("bs_imported",JSON.stringify(imported));
  localStorage.setItem("bs_saved",JSON.stringify(saved));
  localStorage.setItem("bs_pipeline",JSON.stringify(pipeline));
}
function money(n){if(!n)return "—"; return n>=1e6?`$${(n/1e6).toFixed(1)}M`:`$${Number(n).toLocaleString()}`}
function filtered(){
  const q=query.toLowerCase();
  return projects.filter(p =>
    (!q || `${p.name} ${p.city} ${p.gc||""} ${p.developer||""} ${p.permit_number||""}`.toLowerCase().includes(q)) &&
    (selectedType==="All" || p.type===selectedType) &&
    (selectedStage==="All" || p.stage===selectedStage) &&
    Number(p.value||0)>=Number(minValue||0)
  );
}
async function logoutBuildScout() {
  try {
    await BuildScoutBackend.signOut();
    currentSession = null;
    projects = [];
    renderAuthScreen("You have been signed out.");
  } catch (error) {
    console.error("Sign out failed:", error);
    alert("Unable to sign out. Please try again.");
  }
}
function shell(){
  app.innerHTML=`<header class="topbar">
    <div class="logo">BUILD<span>SCOUT</span></div>
    <input class="search" id="globalSearch" placeholder="Search projects, companies, permits, cities..." value="${query}">
    <button class="user" onclick="logoutBuildScout()">Sign Out</button>
  </header>
  <div class="shell">
    <aside class="sidebar">
      <div class="nav">
        ${navBtn("dashboard","▦ Dashboard")}
        ${navBtn("projects","◉ Projects")}
        ${navBtn("saved",`★ My Projects (${saved.length})`)}
        ${navBtn("pipeline","▤ Sales Pipeline")}
        ${navBtn("alerts","◇ Alerts")}
        ${navBtn("data","⇅ Data Sources")}
        ${navBtn("admin","⚙ Admin")}
      </div>
      <div class="side-label">Quick filters</div>
      <div class="quick">
        <button onclick="quick('All')">All</button>
        ${["Multifamily","Commercial","Industrial","Mixed-use","Residential"].map(x=>`<button onclick="quick('${x}')">${x}</button>`).join("")}
        ${["Pre-construction","Active","Permit approved","Planning"].map(x=>`<button onclick="quickStage('${x}')">${x}</button>`).join("")}
      </div>
      <div class="note">V2 uses a real interactive street map. Demo records stay clearly labeled until verified permit data is imported.</div>
    </aside>
    <main class="main" id="main"></main>
  </div>`;
  document.getElementById("globalSearch").addEventListener("input",e=>{query=e.target.value;renderPage()});
}
function navBtn(id,label){return `<button class="${page===id?"active":""}" onclick="go('${id}')">${label}</button>`}
function go(p){page=p;shell();renderPage()}
function quick(x){selectedType=x;selectedStage="All";page="dashboard";shell();renderPage()}
function quickStage(x){selectedStage=x;selectedType="All";page="dashboard";shell();renderPage()}

function filterBar(){
  const types=["All","Multifamily","Commercial","Industrial","Mixed-use","Residential"];
  const stages=["All","Planning","Permit approved","Pre-construction","Active"];
  return `<div class="filterbar">
    <select onchange="selectedType=this.value;renderPage()">${types.map(x=>`<option ${x===selectedType?"selected":""}>${x}</option>`).join("")}</select>
    <select onchange="selectedStage=this.value;renderPage()">${stages.map(x=>`<option ${x===selectedStage?"selected":""}>${x}</option>`).join("")}</select>
    <select onchange="minValue=this.value;renderPage()">
      <option value="0" ${minValue==0?"selected":""}>Any value</option>
      <option value="10000000" ${minValue==10000000?"selected":""}>$10M+</option>
      <option value="25000000" ${minValue==25000000?"selected":""}>$25M+</option>
      <option value="50000000" ${minValue==50000000?"selected":""}>$50M+</option>
    </select>
    <button class="btn secondary" onclick="query='';selectedType='All';selectedStage='All';minValue=0;shell();renderPage()">Reset</button>
  </div>`;
}async function addProjectToPipeline(projectId) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    await BuildScoutBackend.updatePipeline(
      userId,
      projectId,
      "New Opportunity"
    );

    pipeline[projectId] = "New Opportunity";
    persist();

    page = "pipeline";
    shell();
    renderPage();

  } catch (error) {
    console.error("Failed to add project to pipeline:", error);
    alert("Unable to add project to pipeline. Please try again.");
  }
}

function projectCard(p){
  return `<div class="project-card">
    <div class="score">${p.score||70}/100</div>
    <span class="tag">${p.type||"Project"}</span><span class="tag">${p.stage||"Unknown stage"}</span>
    <h3>${esc(p.name||"Unnamed project")}</h3>
    <div class="muted">${esc(p.city||"DFW")}</div>
    <div class="meta"><div><small>Value</small><b>${money(p.value)}</b></div><div><small>Units</small><b>${p.units||"—"}</b></div></div>
    <div class="note">${p.source==="BuildScout demo data"?"DEMO":"IMPORTED"} • ${esc(p.source||"Unknown source")}</div>
    <div style="margin-top:9px"><button class="btn primary" onclick="viewProject('${p.id}')">View</button> <button class="btn secondary" onclick="toggleSave('${p.id}')">${saved.includes(p.id)?"Saved":"Save"}</button></div>
  </div>`;
}
function renderPage(){
  const main=document.getElementById("main");
  if(page==="dashboard"){
    const ps = filtered().sort((a, b) => (b.score || 0) - (a.score || 0));
    main.innerHTML=`<div class="pagehead"><div><h1>Construction Intelligence</h1><div class="muted">Find projects before your competition.</div></div><button class="btn primary" onclick="go('data')">Import permit data</button></div>
      <div class="statline">
        <div class="stat"><small>Matching projects</small><b>${ps.length}</b></div>
      <div class="stat"><small>Imported records</small><b>${projects.length}</b></div>
        <div class="stat"><small>Saved projects</small><b>${saved.length}</b></div>
        <div class="stat"><small>High-opportunity</small><b>${ps.filter(p=>(p.score||0)>=75).length}</b></div>
      </div>${filterBar()}
      <div class="map-wrap"><div id="map"></div><div class="listpanel">${ps.map(projectCard).join("")||"<div class='muted'>No projects match.</div>"}</div></div>`;
    setTimeout(()=>initMap(ps),0);
  } else if(page==="projects"){
    main.innerHTML=`<div class="pagehead"><div><h1>Projects</h1><div class="muted">All demo and imported construction records.</div></div></div>${filterBar()}<div class="grid">${filtered().map(projectCard).join("")}</div>`;
  } else if(page==="saved"){
    const ps=projects.filter(p=>saved.includes(p.id));
    main.innerHTML=`<div class="pagehead"><div><h1>My Projects</h1><div class="muted">Your active prospect list.</div></div></div><div class="grid">${ps.map(projectCard).join("")||"<div class='panel muted'>No saved projects yet.</div>"}</div>`;
  } else if(page==="pipeline"){renderPipeline(main)}
  else if(page==="alerts"){renderAlerts(main)}
  else if(page==="data"){BuildScoutDataSources.render()}
  else if(page==="admin"){renderAdmin(main)}
}
function initMap(ps) {
  if (map) {
    map.remove();
  }
  map = L.map("map", {
    zoomControl: true,
    minZoom: 3,
    maxZoom: 18
  }).setView(
    CFG.mapCenter,
    CFG.mapZoom
  );
  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: true
    }
  ).addTo(map);
  markerLayer =
  L.featureGroup().addTo(map);
 ps
  .filter(p => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= 32.0 &&
      lat <= 33.5 &&
      lon >= -98.0 &&
      lon <= -96.0
    );
  })
    .forEach(p => {
      const marker =
        L.marker([
          Number(p.lat),
          Number(p.lon)
        ]).addTo(markerLayer);
      marker.bindPopup(`
        <b>${esc(p.name)}</b>
        <br>
        ${esc(p.city || "")}
        <br>
        ${money(p.value)}
        •
        ${p.score || 70}/100
        <br><br>
        <button
          onclick="viewProject('${p.id}')"
        >
          Open project
        </button>
      `);
    });
 setTimeout(() => {
  map.invalidateSize();

  if (markerLayer.getLayers().length > 0) {
    const bounds = markerLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 11
      });
    }
  }
}, 250);
}
function viewProject(id){
  const p=projects.find(x=>x.id===id); if(!p)return;
  document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="modal"><div class="modalbox">
    <button class="close" onclick="document.getElementById('modal').remove()">✕</button>
    <span class="tag">${esc(p.type||"Project")}</span><span class="tag">${esc(p.stage||"Unknown")}</span>
    <h1>${esc(p.name)}</h1><div class="muted">${esc(p.city||"")}</div>
    <div class="statline" style="margin-top:18px">
      <div class="stat"><small>Estimated value</small><b>${money(p.value)}</b></div>
      <div class="stat"><small>Units</small><b>${p.units||"—"}</b></div>
      <div class="stat"><small>Start</small><b>${esc(p.start||"Unknown")}</b></div>
      <div class="stat"><small>Opportunity score</small><b>${p.score||70}/100</b></div>
    </div>
    <div class="grid">
      <div class="panel"><h3>Project team</h3><p><b>Developer:</b> ${esc(p.developer||"Unknown")}</p><p><b>GC:</b> ${esc(p.gc||"Unknown")}</p><p><b>Architect:</b> ${esc(p.architect||"Unknown")}</p></div>
      <div class="panel"><h3>Permit intelligence</h3><p><b>Permit:</b> ${esc(p.permit_number||"Unknown")}</p><p><b>Source:</b> ${esc(p.source||"Unknown")}</p><p><b>Last verified:</b> ${esc(p.verified||"Unknown")}</p></div>
    </div>
    <div class="panel" style="margin-top:12px"><h3>Why pursue it?</h3><p>${(p.score||70)>=85?"High priority: project size, stage, and location make this a strong candidate for early sales outreach.":"Moderate priority: verify the project stage and trade fit before outreach."}</p></div>
    <div style="margin-top:14px"><button class="btn primary" onclick="toggleSave('${p.id}');document.getElementById('modal').remove()">Save project</button> <button class="btn secondary" onclick="addPipeline('${p.id}');document.getElementById('modal').remove()">Add to pipeline</button></div>
  </div></div>`);
}
function toggleSave(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];persist();shell();renderPage()}
function addPipeline(id){pipeline[id]="New Opportunity";persist();go("pipeline")}
function renderPipeline(main){
  const stages=["New Opportunity","Researching","Contacted","Quoted"];
  main.innerHTML=`<div class="pagehead"><div><h1>Sales Pipeline</h1><div class="muted">Move projects from discovery toward a sale.</div></div></div><div class="pipeline">
    ${stages.map(s=>`<div class="column"><h3>${s}</h3>${projects.filter(p=>(pipeline[p.id]||"")===s).map(p=>`<div class="lead"><b>${esc(p.name)}</b><div class="muted">${money(p.value)}</div><button class="btn secondary" style="margin-top:8px" onclick="advance('${p.id}')">Advance →</button></div>`).join("")}</div>`).join("")}
  </div>`;
}
function advance(id){
  const s=["New Opportunity","Researching","Contacted","Quoted"];let i=s.indexOf(pipeline[id]);pipeline[id]=s[Math.min(i+1,s.length-1)];persist();renderPage();
}
function renderAlerts(main){
  main.innerHTML=`<div class="pagehead"><div><h1>Alerts</h1><div class="muted">MVP alert preferences. Automated email delivery comes with the backend.</div></div></div>
  <div class="panel"><h3>Recommended launch alert</h3><p>Multifamily • $10M+ • Planning / Permit Approved / Pre-construction • DFW</p>
  <button class="btn primary" onclick="alert('Alert preference saved locally for the MVP.')">Save alert</button></div>`;
}
function renderData(main){
  main.innerHTML=`<div class="pagehead"><div><h1>Data Sources</h1><div class="muted">Bring real permit/project data into BuildScout.</div></div></div>
  <div class="grid">${CFG.sources.map(s=>`<div class="source-card"><h3>${esc(s.city)}</h3><div>${esc(s.label)}</div><p class="muted">${esc(s.mode)}</p><a href="${s.url}" target="_blank" rel="noopener"><button class="btn secondary">Open official source</button></a></div>`).join("")}</div>
  <div class="panel" style="margin-top:14px"><h2>Import real permit data</h2>
    <div class="importbox">
      <p>Upload a <b>CSV</b> or <b>JSON</b> export. BuildScout will normalize common column names and add the projects to the real map.</p>
      <input type="file" id="importFile" accept=".csv,.json,application/json,text/csv"/>
      <button class="btn primary" onclick="importSelected()">Import file</button>
      <p class="note">Required for map pins: latitude + longitude. For city exports without coordinates, geocoding should be added in the production backend rather than exposing a geocoding key in the browser.</p>
    </div>
    <h3 style="margin-top:20px">Recommended columns</h3>
    <table><tr><th>BuildScout field</th><th>Accepted examples</th></tr>
      <tr><td>name</td><td>project_name, permit_description, work_description</td></tr>
      <tr><td>city</td><td>city, municipality</td></tr>
      <tr><td>lat</td><td>lat, latitude, y</td></tr>
      <tr><td>lon</td><td>lon, lng, longitude, x</td></tr>
      <tr><td>value</td><td>value, construction_value, const_value</td></tr>
      <tr><td>permit_number</td><td>permit_number, permit_no, folder_number</td></tr>
      <tr><td>stage</td><td>status, stage</td></tr>
      <tr><td>type</td><td>project_type, permit_type, main_use</td></tr>
    </table>
    <div style="margin-top:14px"><button class="btn secondary" onclick="downloadTemplate()">Download CSV template</button> <button class="btn danger" onclick="clearImported()">Clear imported records</button></div>
  </div>`;
}
function importSelected(){
  const f=document.getElementById("importFile").files[0]; if(!f){alert("Choose a CSV or JSON file first.");return}
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      let rows=f.name.toLowerCase().endsWith(".json")?JSON.parse(e.target.result):parseCSV(e.target.result);
      if(!Array.isArray(rows)) rows=rows.features?rows.features.map(x=>({...x.properties,lat:x.geometry?.coordinates?.[1],lon:x.geometry?.coordinates?.[0]})):[rows];
      const normalized=rows.map((r,i)=>normalize(r,i)).filter(Boolean);
      imported=[...normalized,...imported];projects=[...imported,...DEMO];persist();alert(`Imported ${normalized.length} records. Records without coordinates still appear in lists but not as map pins.`);go("dashboard");
    }catch(err){alert("Import failed: "+err.message)}
  };
  reader.readAsText(f);
}
function normalize(r,i){
  const get=(...keys)=>{for(const k of keys){const found=Object.keys(r).find(x=>x.toLowerCase().replace(/\s+/g,"_")===k);if(found!=null&&r[found]!==""&&r[found]!=null)return r[found]}return ""};
  const val=(get("value","construction_value","const_value","const._value")+"").replace(/[$,]/g,"");
  const lat=parseFloat(get("lat","latitude","y")),lon=parseFloat(get("lon","lng","longitude","x"));
  const pname=get("name","project_name","permit_description","work_description","address")||`Imported permit ${i+1}`;
  const status=get("stage","status")||"Imported";
  const permit=get("permit_number","permit_no","folder_number")||`import-${Date.now()}-${i}`;
  return {
    id:`imp-${Date.now()}-${i}`,name:String(pname),city:String(get("city","municipality")||"DFW"),
    lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null,
    type:String(get("type","project_type","permit_type","main_use")||"Commercial"),
    stage:String(status),value:Number(val)||0,units:Number(get("units","unit_count"))||null,
    start:String(get("start","start_date","issued_date","issue_date")||"Unknown"),
    score:calculateScore(Number(val)||0,String(status)),
    developer:String(get("developer","owner","property_owner")||"Unknown"),
    gc:String(get("gc","general_contractor","contractor","contractor_business_name")||"Unknown"),
    architect:String(get("architect")||"Unknown"),trade:[],
    source:String(get("source")||"Imported permit data"),source_url:String(get("source_url")||""),
    verified:new Date().toLocaleDateString(),permit_number:String(permit)
  }
}
function calculateScore(value,stage){
  let s=60;if(value>=10000000)s+=8;if(value>=25000000)s+=8;if(value>=50000000)s+=5;
  const x=stage.toLowerCase();if(x.includes("permit")||x.includes("pre"))s+=12;else if(x.includes("planning"))s+=10;else if(x.includes("active"))s+=4;
  return Math.min(98,s);
}
function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c=='"'&&q&&n=='"'){cur+='"';i++}else if(c=='"'){q=!q}else if(c==','&&!q){row.push(cur);cur=""}else if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&n=='\n')i++;row.push(cur);if(row.some(x=>x.trim()!==""))rows.push(row);row=[];cur=""}else cur+=c}
  if(cur||row.length){row.push(cur);rows.push(row)}
  const headers=rows.shift().map(x=>x.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||"").trim()])));
}
function downloadTemplate(){
  const csv="name,city,lat,lon,type,stage,value,units,start,permit_number,developer,gc,architect,source,source_url\\nExample Project,Fort Worth TX,32.7555,-97.3308,Multifamily,Permit approved,25000000,220,2026-10-01,EXAMPLE-001,Example Developer,Example GC,Example Architect,Official city export,";
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="buildscout_import_template.csv";a.click();URL.revokeObjectURL(a.href);
}
function clearImported(){if(confirm("Remove all imported records from this browser?")){imported=[];projects=[...DEMO];persist();go("data")}}
function renderAdmin(main){
  main.innerHTML=`<div class="pagehead"><div><h1>Admin Dashboard</h1><div class="muted">MVP operations and data health.</div></div></div>
  <div class="statline"><div class="stat"><small>Total projects</small><b>${projects.length}</b></div><div class="stat"><small>Imported</small><b>${imported.length}</b></div><div class="stat"><small>Demo</small><b>${DEMO.length}</b></div><div class="stat"><small>Saved</small><b>${saved.length}</b></div></div>
  <div class="panel"><h3>Production checklist</h3><p class="badge-good">● Real map enabled</p><p class="badge-good">● CSV / JSON permit import enabled</p><p class="badge-good">● Browser persistence enabled</p><p class="badge-warn">● Backend database not connected</p><p class="badge-warn">● Authentication not connected</p><p class="badge-warn">● Automated municipal ingestion not connected</p><p class="badge-warn">● Stripe not connected</p></div>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
bootBuildScout();
