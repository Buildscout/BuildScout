
const CFG=window.BUILDSCOUT_CONFIG, DEMO=window.BUILDSCOUT_DEMO_PROJECTS;
let imported=JSON.parse(localStorage.getItem("bs_imported")||"[]"); 
let saved=JSON.parse(localStorage.getItem("bs_saved")||"[]");
let pipeline=JSON.parse(localStorage.getItem("bs_pipeline")||"{}");
let pipelineDetails = {};

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

  const userId = currentSession.user.id;

  const savedRows = await BuildScoutBackend.getSavedProjects(userId);
  saved = savedRows.map(row => row.project_id);

  const pipelineRows = await BuildScoutBackend.getPipeline(userId);

  pipeline = {};
  pipelineDetails = {};

  pipelineRows.forEach(row => {
    pipeline[row.project_id] = row.stage;

    pipelineDetails[row.project_id] = {
      notes: row.notes || "",
      follow_up_at: row.follow_up_at || null
    };
  });

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
      score: calculateOpportunityScore(p),
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
let projectMarkers = {};
const app=document.getElementById("app");

function persist(){
  localStorage.setItem("bs_imported",JSON.stringify(imported));
  localStorage.setItem("bs_saved",JSON.stringify(saved));
  localStorage.setItem("bs_pipeline",JSON.stringify(pipeline));
}
function money(n){if(!n)return "—"; return n>=1e6?`$${(n/1e6).toFixed(1)}M`:`$${Number(n).toLocaleString()}`}
function calculateOpportunityScore(p){
  let score = 35;

  const value = Number(p.estimated_value || p.value || 0);
  const stage = String(p.stage || "").toLowerCase();
  const type = String(p.project_type || p.type || "").toLowerCase();

  if (value >= 25000000) score += 20;
  else if (value >= 10000000) score += 17;
  else if (value >= 5000000) score += 14;
  else if (value >= 1000000) score += 10;
  else if (value >= 500000) score += 6;
  else if (value > 0) score += 3;

  if (
    stage.includes("pre-construction") ||
    stage.includes("preconstruction")
  ) {
    score += 20;
  } else if (stage.includes("permit approved")) {
    score += 18;
  } else if (stage.includes("planning")) {
    score += 17;
  } else if (stage.includes("permit")) {
    score += 14;
  } else if (stage.includes("construction")) {
    score += 8;
  }

  if (type.includes("multifamily")) score += 10;
  else if (type.includes("commercial")) score += 8;
  else if (type.includes("industrial")) score += 8;
  else if (type.includes("mixed")) score += 9;
  else if (type.includes("residential")) score += 5;

  if (p.general_contractor || p.gc) score += 5;
  if (p.developer) score += 5;
  if (p.permit_number) score += 3;
  if (p.street_address) score += 2;

  return Math.min(100, Math.max(0, Math.round(score)));
}
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
  return `<div
    class="project-card"
    id="project-card-${p.id}"
    onclick="focusProjectOnMap('${p.id}')"
    style="cursor:pointer;"
  >
    <div class="score">
  ${p.score || 70}/100
  <span style="
    margin-left:6px;
    font-size:11px;
    font-weight:800;
    padding:3px 7px;
    border-radius:999px;
    ${
      (p.score || 70) >= 90
        ? "background:#3b1616;color:#ff6b6b;"
        : (p.score || 70) >= 80
        ? "background:#12351f;color:#65e58c;"
        : (p.score || 70) >= 65
        ? "background:#3a2f12;color:#f5c451;"
        : "background:#252b33;color:#9ca8b6;"
    }
  ">
    ${
      (p.score || 70) >= 90
        ? "HOT"
        : (p.score || 70) >= 80
        ? "STRONG"
        : (p.score || 70) >= 65
        ? "WATCH"
        : "LOW"
    }
  </span>
</div>

    <span class="tag">${p.type || "Project"}</span>
    <span class="tag">${p.stage || "Unknown stage"}</span>

    <h3>${esc(p.name || "Unnamed project")}</h3>

    <div class="muted">${esc(p.city || "DFW")}</div>

    <div class="meta">
      <div>
        <small>Value</small>
        <b>${money(p.value)}</b>
      </div>

      <div>
        <small>Units</small>
        <b>${p.units || "—"}</b>
      </div>
    </div>

    <div class="note">
      ${p.source === "BuildScout demo data" ? "DEMO" : "IMPORTED"}
      •
      ${esc(p.source || "Unknown source")}
    </div>

    <div style="margin-top:9px">
      <button
        class="btn primary"
        onclick="event.stopPropagation();viewProject('${p.id}')"
      >
        View
      </button>
    </div>
  </div>`;
}

function focusProjectOnMap(id){
  const project = projects.find(p => String(p.id) === String(id));

  if (!project || !map) return;

  const lat = Number(project.lat);
  const lon = Number(project.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  map.setView([lat, lon], Math.max(map.getZoom(), 15), {
    animate: true
  });

  const marker = projectMarkers[id];

  if (marker) {
    marker.openPopup();
  }

  highlightProjectCard(id);
}

function highlightProjectCard(id){
  document.querySelectorAll(".project-card").forEach(card => {
    card.style.outline = "";
    card.style.boxShadow = "";
  });

  const card = document.getElementById(`project-card-${id}`);

  if (!card) return;

  card.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  card.style.outline = "2px solid #ff9f32";
  card.style.boxShadow = "0 0 0 4px rgba(255,159,50,.15)";

  setTimeout(() => {
    card.style.outline = "";
    card.style.boxShadow = "";
  }, 2500);
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
  projectMarkers = {};
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

  projectMarkers[p.id] = marker;

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

  marker.on("click", () => {
    highlightProjectCard(p.id);
  });
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
  const p = projects.find(x => String(x.id) === String(id));
  if (!p) return;

  const score = Number(p.score || 70);
  const isSaved = saved.includes(p.id);

  const location = [
    p.street_address,
    p.city,
    p.zip_code
  ].filter(Boolean).join(", ");

  let opportunityText = "This project may be worth monitoring as more information becomes available.";

  if (score >= 85) {
    opportunityText = "High-priority opportunity. Strong project signals indicate this lead deserves immediate attention.";
  } else if (score >= 70) {
    opportunityText = "Good opportunity. Review the permit, project team, and timing to determine the best outreach strategy.";
  }

  document.getElementById("modal")?.remove();

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal" id="modal">
      <div class="modalbox">

        <button
          class="close"
          onclick="document.getElementById('modal').remove()"
        >
          ×
        </button>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="tag">${esc(p.type || "Project")}</span>
          <span class="tag">${esc(p.stage || "Unknown stage")}</span>
        </div>

        <h1 style="margin-bottom:6px;">
          ${esc(p.name || "Unnamed project")}
        </h1>

        <div class="muted" style="font-size:16px;">
          ${esc(location || p.city || "Location unavailable")}
        </div>

        <div class="statline" style="margin-top:20px;">
          <div class="stat">
            <small>Estimated value</small>
            <b>${money(p.value)}</b>
          </div>

          <div class="stat">
            <small>Units</small>
            <b>${p.units || "—"}</b>
          </div>

          <div class="stat">
            <small>Opportunity score</small>
            <b>${score}/100</b>
          </div>

          <div class="stat">
            <small>Permit number</small>
            <b>${esc(p.permit_number || "—")}</b>
          </div>
        </div>

        <div class="grid" style="margin-top:18px;">

          <div class="panel">
            <h3>Project team</h3>

            <p>
              <b>Developer / Owner</b><br>
              ${esc(p.developer || "Not identified yet")}
            </p>

            <p>
              <b>General contractor</b><br>
              ${esc(p.gc || "Not identified yet")}
            </p>
          </div>

          <div class="panel">
            <h3>Project intelligence</h3>

            <p>
              <b>Project type</b><br>
              ${esc(p.type || "Unknown")}
            </p>

            <p>
              <b>Current stage</b><br>
              ${esc(p.stage || "Unknown")}
            </p>

            <p>
              <b>Source</b><br>
              ${esc(p.source || "Unknown source")}
            </p>
          </div>

        </div>

        <div class="panel" style="margin-top:14px;">
          <h3>Location</h3>

          <p>
            ${esc(location || "Address information not available")}
          </p>
        </div>

        <div class="panel" style="margin-top:14px;">
          <h3>Why pursue this project?</h3>

          <p>${esc(opportunityText)}</p>
        </div>

        <div
          style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:18px;
          "
        >
          <button
            class="btn primary"
            onclick="toggleSave('${p.id}')"
          >
            ${isSaved ? "Saved" : "Save project"}
          </button>

          <button
            class="btn secondary"
            onclick="addProjectToPipeline('${p.id}');document.getElementById('modal')?.remove()"
          >
            Add to pipeline
          </button>

          ${
            Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))
              ? `
                <button
                  class="btn secondary"
                  onclick="document.getElementById('modal')?.remove();go('dashboard');setTimeout(()=>focusProjectOnMap('${p.id}'),400)"
                >
                  Show on map
                </button>
              `
              : ""
          }
        </div>

      </div>
    </div>
  `);
}
async function toggleSave(id) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    if (saved.includes(id)) {
      await BuildScoutBackend.unsaveProject(userId, id);
      saved = saved.filter(x => x !== id);
    } else {
      await BuildScoutBackend.saveProject(userId, id);
      saved = [...saved, id];
    }

    shell();
    renderPage();
  } catch (error) {
    console.error("Failed to update saved project:", error);
    alert("Unable to update saved project. Please try again.");
  }
}
async function addPipeline(id) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    const stage = "New Opportunity";

    await BuildScoutBackend.updatePipeline(userId, id, stage);

    pipeline[id] = stage;

    go("pipeline");
  } catch (error) {
    console.error("Failed to add project to pipeline:", error);
    alert("Unable to add project to pipeline. Please try again.");
  }
}
function renderPipeline(main) {
  const stages = ["New Opportunity", "Researching", "Contacted", "Quoted"];

  main.innerHTML = `
    <div class="pagehead">
      <div>
        <h1>Sales Pipeline</h1>
        <div class="muted">Move projects from discovery toward a sale.</div>
      </div>
    </div>

    <div class="pipeline-grid">
      ${stages.map(stage => `
        <div class="column">
          <h3>${stage}</h3>

          ${projects
            .filter(p => (pipeline[p.id] || "") === stage)
            .map(p => {
              const details = pipelineDetails[p.id] || {};
              const notes = details.notes || "";
              const followUp = details.follow_up_at
                ? new Date(details.follow_up_at).toISOString().slice(0, 10)
                : "";

              return `
                <div class="project-card">
                  <h3>${esc(p.name || "Unnamed project")}</h3>
                  <div class="muted">${esc(p.city || "")}</div>
                  <div style="margin-top:8px"><b>${money(p.value)}</b></div>

                  <textarea
                    id="pipelineNotes-${p.id}"
                    placeholder="Add notes..."
                    style="width:100%;min-height:80px;margin-top:12px;padding:10px;box-sizing:border-box;"
                  >${esc(notes)}</textarea>

                  <input
                    id="pipelineFollowUp-${p.id}"
                    type="date"
                    value="${followUp}"
                    style="width:100%;margin-top:8px;padding:10px;box-sizing:border-box;"
                  />

                  <div style="display:flex;gap:8px;margin-top:10px;">
                    <button
                      class="btn secondary"
                      onclick="savePipelineDetails('${p.id}')"
                    >
                      Save
                    </button>

                    <button
                      class="btn primary"
                      onclick="advance('${p.id}')"
                    >
                      Advance →
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `).join("")}
    </div>
  `;
}
async function savePipelineDetails(id) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    const notes =
      document.getElementById(`pipelineNotes-${id}`)?.value || "";

    const followUpValue =
      document.getElementById(`pipelineFollowUp-${id}`)?.value || "";

    const followUpAt = followUpValue
      ? new Date(`${followUpValue}T12:00:00`).toISOString()
      : null;

    const stage = pipeline[id] || "New Opportunity";

    await BuildScoutBackend.updatePipeline(
      userId,
      id,
      stage,
      notes,
      followUpAt
    );

    pipelineDetails[id] = {
      notes,
      follow_up_at: followUpAt
    };

    alert("Pipeline details saved.");
  } catch (error) {
    console.error("Failed to save pipeline details:", error);
    alert("Unable to save pipeline details. Please try again.");
  }
}
async function advance(id) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    const stages = [
      "New Opportunity",
      "Researching",
      "Contacted",
      "Quoted"
    ];

    const currentIndex = stages.indexOf(pipeline[id]);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, stages.length - 1);
    const nextStage = stages[nextIndex];

    await BuildScoutBackend.updatePipeline(userId, id, nextStage);

    pipeline[id] = nextStage;

    renderPage();
  } catch (error) {
    console.error("Failed to advance pipeline:", error);
    alert("Unable to update pipeline. Please try again.");
  }
}
async function renderAlerts(main) {
  const userId = currentSession?.user?.id;

  if (!userId) {
    renderAuthScreen("Please sign in again.");
    return;
  }

  main.innerHTML = `
    <div class="pagehead">
      <div>
        <h1>Alerts</h1>
        <div class="muted">
          Create alerts for the construction opportunities you want to track.
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Create new alert</h3>

      <div style="
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
        margin-top:16px;
      ">

        <div>
          <small class="muted">Alert name</small>
          <input
            id="alertName"
            type="text"
            placeholder="Example: Dallas Multifamily"
            style="
              width:100%;
              box-sizing:border-box;
              margin-top:6px;
              padding:11px;
              border-radius:8px;
              border:1px solid #38505f;
              background:#08131d;
              color:white;
            "
          />
        </div>

        <div>
          <small class="muted">Market / City</small>
          <input
            id="alertMarket"
            type="text"
            placeholder="Dallas, TX"
            style="
              width:100%;
              box-sizing:border-box;
              margin-top:6px;
              padding:11px;
              border-radius:8px;
              border:1px solid #38505f;
              background:#08131d;
              color:white;
            "
          />
        </div>

        <div>
          <small class="muted">Project type</small>
          <select
            id="alertProjectType"
            style="
              width:100%;
              box-sizing:border-box;
              margin-top:6px;
              padding:11px;
              border-radius:8px;
              border:1px solid #38505f;
              background:#08131d;
              color:white;
            "
          >
            <option value="">Any project type</option>
            <option value="Multifamily">Multifamily</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Mixed-use">Mixed-use</option>
            <option value="Residential">Residential</option>
          </select>
        </div>

        <div>
          <small class="muted">Minimum project value</small>
          <input
            id="alertMinValue"
            type="number"
            min="0"
            step="100000"
            placeholder="10000000"
            style="
              width:100%;
              box-sizing:border-box;
              margin-top:6px;
              padding:11px;
              border-radius:8px;
              border:1px solid #38505f;
              background:#08131d;
              color:white;
            "
          />
        </div>

        <div>
          <small class="muted">Project stage</small>
          <select
            id="alertStage"
            style="
              width:100%;
              box-sizing:border-box;
              margin-top:6px;
              padding:11px;
              border-radius:8px;
              border:1px solid #38505f;
              background:#08131d;
              color:white;
            "
          >
            <option value="">Any stage</option>
            <option value="Planning">Planning</option>
            <option value="Pre-construction">Pre-construction</option>
            <option value="Permit approved">Permit approved</option>
            <option value="Active">Active</option>
          </select>
        </div>

      </div>

      <button
        class="btn primary"
        style="margin-top:16px;"
        onclick="saveCustomAlert()"
      >
        Create alert
      </button>
    </div>

    <div id="savedAlerts" style="margin-top:18px;">
      <div class="muted">Loading your alerts...</div>
    </div>
  `;

  try {
    const alerts = await BuildScoutBackend.getAlerts(userId);
    const container = document.getElementById("savedAlerts");

    if (!alerts.length) {
      container.innerHTML = `
        <div class="panel">
          <h3>Your alerts</h3>
          <p class="muted">
            You haven't created any alerts yet.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="panel">
        <h3>Your alerts</h3>

        ${(
  await Promise.all(
    alerts.map(async a => {
      const f = a.filters || {};
     const matchResult = a.is_active
  ? await BuildScoutBackend.getMatchingProjects(f)
  : { projects: [], count: 0 };

      const details = [
        f.market || null,
        f.project_type || null,
        f.min_value
          ? "$" + Number(f.min_value).toLocaleString() + "+"
          : null,
        f.stage || null
      ]
        .filter(Boolean)
        .join(" • ");

      return `
        <div style="
          padding:16px 0;
          border-bottom:1px solid rgba(255,255,255,.1);
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            gap:16px;
            align-items:center;
          ">
            <div>
              <b>${esc(a.name)}</b>

              <div class="muted" style="margin-top:4px;">
                ${details ? esc(details) : "All opportunities"}
              </div>

              <div
                class="muted"
                style="margin-top:4px;font-size:12px;"
              >
                ${a.is_active ? "Active" : "Paused"}
              </div>

              ${
                a.is_active
                  ? `
                    <div style="margin-top:10px;font-weight:700;">
                     ${matchResult.count} matching project${matchResult.count === 1 ? "" : "s"}
                    </div>
                  `
                  : ""
              }
            </div>

            <div style="display:flex;gap:8px;">
              <button
                class="btn"
                onclick="toggleAlert('${a.id}', ${!a.is_active})"
              >
                ${a.is_active ? "Pause" : "Activate"}
              </button>

              <button
                class="btn"
                onclick="removeAlert('${a.id}')"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    })
  )
).join("")}
      </div>
    `;

  } catch (error) {
    console.error("Failed to load alerts:", error);

    document.getElementById("savedAlerts").innerHTML = `
      <div class="panel">
        <p>Unable to load alerts. Please try again.</p>
      </div>
    `;
  }
}
async function saveCustomAlert() {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    const name =
      document.getElementById("alertName")?.value.trim();

    const market =
      document.getElementById("alertMarket")?.value.trim();

    const projectType =
      document.getElementById("alertProjectType")?.value || "";

    const minValueRaw =
      document.getElementById("alertMinValue")?.value || "";

    const stage =
      document.getElementById("alertStage")?.value || "";

    if (!name) {
      alert("Give this alert a name.");
      return;
    }

    const filters = {};

    if (market) filters.market = market;
    if (projectType) filters.project_type = projectType;
    if (minValueRaw) filters.min_value = Number(minValueRaw);
    if (stage) filters.stage = stage;

    await BuildScoutBackend.saveAlert(
      userId,
      name,
      filters
    );

    const main = document.getElementById("main");
    await renderAlerts(main);

  } catch (error) {
    console.error("Failed to save alert:", error);
    alert("Unable to save alert. Please try again.");
  }
}
    

async function toggleAlert(alertId, isActive) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    await BuildScoutBackend.updateAlert(
      userId,
      alertId,
      { is_active: isActive }
    );

    const main = document.getElementById("main");
    await renderAlerts(main);
  } catch (error) {
    console.error("Failed to update alert:", error);
    alert("Unable to update alert. Please try again.");
  }
}

async function removeAlert(alertId) {
  try {
    const userId = currentSession?.user?.id;

    if (!userId) {
      renderAuthScreen("Please sign in again.");
      return;
    }

    await BuildScoutBackend.deleteAlert(userId, alertId);

    const main = document.getElementById("main");
    await renderAlerts(main);
  } catch (error) {
    console.error("Failed to delete alert:", error);
    alert("Unable to delete alert. Please try again.");
  }
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
