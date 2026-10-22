
const CFG=window.BUILDSCOUT_CONFIG, DEMO=window.BUILDSCOUT_DEMO_PROJECTS;
let imported=JSON.parse(localStorage.getItem("bs_imported")||"[]"); 
// User-specific state is loaded from Supabase after authentication.
// Do not hydrate it from localStorage: browser storage is shared across sign-ins
// on the same device and can briefly show stale data from another session.
let saved = [];
let projects = [];
let projectsLoading = false;
let pipeline = {};
let pipelineDetails = {};

let currentSession = null;
let authMode = "signin";

function renderLandingPage() {
  const root=document.getElementById("app");
  root.innerHTML=`
    <div class="public-site">
      <header class="public-nav">
        <div class="logo">BUILD<span>SCOUT</span></div>
        <nav class="public-links"><a href="#how">How it works</a><a href="#intelligence">Intelligence</a><a href="#plans">Plans</a></nav>
        <div class="public-auth"><button class="btn secondary" onclick="authMode='signin';renderAuthScreen()">Sign in</button><button class="btn primary" onclick="authMode='signup';renderAuthScreen()">Start free</button></div>
      </header>
      <main>
        <section class="public-hero">
          <div class="public-hero-copy">
            <div class="public-pill"><span></span> Built for construction sales teams</div>
            <h1>Stop chasing permits.<br><em>Start finding opportunities.</em></h1>
            <p>BuildScout connects construction projects, project teams, plans and sales intelligence so you can find the right opportunity, know who to call, and act before the competition.</p>
            <div class="public-actions"><button class="btn primary public-cta" onclick="authMode='signup';renderAuthScreen()">Start finding projects →</button><button class="btn secondary" onclick="authMode='signin';renderAuthScreen()">Sign in</button></div>
            <div class="public-proof"><span>✓ Project intelligence</span><span>✓ Plans & specs</span><span>✓ Company research</span><span>✓ Sales pipeline</span></div>
          </div>
          <div class="product-mockup">
            <div class="mock-top"><div class="mock-logo">B<span>S</span></div><div class="mock-search">Search projects, companies, cities…</div><div class="mock-user"></div></div>
            <div class="mock-body"><div class="mock-side"><i></i><i></i><i></i><i></i></div><div class="mock-map">
              <div class="map-grid"></div><span class="map-pin p1">●</span><span class="map-pin p2">●</span><span class="map-pin p3">●</span><span class="map-pin p4">●</span>
              <div class="mock-project"><small>STRONG OPPORTUNITY · 86/100</small><b>Mixed-Use Development</b><span>Dallas, TX · $18.5M</span><div><strong>GC identified</strong><strong>24 plans</strong></div><button>View intelligence →</button></div>
            </div></div>
          </div>
        </section>
        <section class="trust-strip"><span>ONE WORKSPACE FOR</span><b>PROJECT DISCOVERY</b><i>+</i><b>PLANS & SPECS</b><i>+</i><b>COMPANY INTELLIGENCE</b><i>+</i><b>SALES EXECUTION</b></section>
        <section class="public-section" id="how">
          <div class="section-heading"><div class="bs-eyebrow">THE BUILDSCOUT ADVANTAGE</div><h2>Construction data is everywhere.<br>Useful intelligence isn't.</h2><p>BuildScout is designed to turn scattered signals into a simple sales workflow.</p></div>
          <div class="advantage-grid">
            <article><div class="feature-icon">⌖</div><span>DISCOVER</span><h3>Find opportunities worth your time</h3><p>Search by market, project type, stage and value. BuildScout keeps source records as evidence while presenting the project as the opportunity.</p></article>
            <article id="plans"><div class="feature-icon">▱</div><span>UNDERSTAND</span><h3>Plans and project details together</h3><p>See authorized plans, specifications, project value, stage and source information from the same project workspace.</p></article>
            <article id="intelligence"><div class="feature-icon">✦</div><span>INTELLIGENCE</span><h3>Know who to reach next</h3><p>Use project-team and company intelligence to focus research and identify the next sales action instead of starting from scratch.</p></article>
            <article><div class="feature-icon">↗</div><span>EXECUTE</span><h3>Turn discovery into revenue</h3><p>Save opportunities, manage follow-ups and move projects through your pipeline from first research to won or lost.</p></article>
          </div>
        </section>
        <section class="public-ai">
          <div><div class="bs-eyebrow">BUILDSCOUT INTELLIGENCE</div><h2>Don't just show customers data.<br>Help them decide what to do with it.</h2><p>The goal is simple: surface what is known, what is missing, and the next useful move—without pretending uncertain data is verified.</p><button class="btn primary public-cta" onclick="authMode='signup';renderAuthScreen()">Try BuildScout →</button></div>
          <div class="ai-card"><div class="ai-card-head"><span>✦ BUILDSCOUT NEXT MOVE</span><b>86</b></div><h3>Review plans and contact the project team</h3><div class="ai-row"><span>General contractor</span><b>Identified</b></div><div class="ai-row"><span>Plans & specs</span><b>24 available</b></div><div class="ai-row"><span>Project stage</span><b>Pre-construction</b></div><div class="ai-action">Recommended: contact estimating team before bid activity increases.</div></div>
        </section>
        <section class="public-final"><div><span>BUILD<span class="orange">SCOUT</span></span><h2>Your next project shouldn't be hidden in a spreadsheet.</h2><p>Find it. Understand it. Reach the right people. Track the opportunity.</p></div><button class="btn primary public-cta" onclick="authMode='signup';renderAuthScreen()">Start finding projects →</button></section>
      </main>
      <footer class="public-footer"><div class="logo">BUILD<span>SCOUT</span></div><span>Construction intelligence for the people who build.</span><button onclick="authMode='signin';renderAuthScreen()">Sign in</button></footer>
    </div>`;
}
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

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAuthText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function handleAuthSubmit() {
  const button = document.getElementById("authSubmit");
  if (button?.dataset.busy === "1") return;

  const email = document.getElementById("authEmail")?.value.trim() || "";
  const password = document.getElementById("authPassword")?.value || "";

  if (button) {
    button.dataset.busy = "1";
    button.disabled = true;
    button.textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
  }

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

    const authData = await BuildScoutBackend.signIn(email, password);

    currentSession = authData?.session || null;

    if (!currentSession?.user) {
      throw new Error(
        "Sign-in succeeded, but BuildScout could not establish your authenticated session."
      );
    }

    await startBuildScout(currentSession);

  } catch (error) {
    console.error("Authentication failed:", error);

    renderAuthScreen(
      error.message || "Authentication failed. Please try again."
    );
  }
}

async function startBuildScout(session = null) {
  currentSession = session || currentSession || await BuildScoutBackend.getSession();

  if (!currentSession?.user) {
    renderAuthScreen("Your session expired. Please sign in again.");
    return;
  }

  const userId = currentSession.user.id;

  // Authentication is complete at this point. Enter the application
  // immediately; never make the user wait for the 32k+ project dataset or
  // optional account-state tables to finish loading.
  pipeline = {};
  pipelineDetails = {};
  saved = [];
  projects = [];
  projectsLoading = true;

  shell();
  renderPage();

  // Load projects in the background. Errors are shown by loadSupabaseProjects
  // without trapping the user on the authentication screen.
  loadSupabaseProjects().catch(error => {
    console.error("Background project load failed:", error);
  });

  // Hydrate optional account state independently.
  BuildScoutBackend.getSavedProjects(userId)
    .then(savedRows => {
      saved = savedRows.map(row => String(row.project_id));
      renderPage();
    })
    .catch(error => {
      saved = [];
      console.warn("Saved projects could not be loaded; continuing without saved state:", error);
    });

  BuildScoutBackend.getPipeline(userId)
    .then(pipelineRows => {
      pipelineRows.forEach(row => {
        pipeline[row.project_id] = row.stage;
        pipelineDetails[row.project_id] = {
          notes: row.notes || "",
          follow_up_at: row.follow_up_at || null
        };
      });
      renderPage();
    })
    .catch(error => {
      console.warn("Pipeline could not be loaded; continuing without pipeline state:", error);
    });
}

async function bootBuildScout() {
  try {
    currentSession = await BuildScoutBackend.getSession();

    if (!currentSession) {
      renderLandingPage();
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
    const rows = await BuildScoutBackend.getProjects(currentSession?.access_token || null);
    // Do not block the dashboard on document-count aggregation. It can span
    // thousands of rows and is not required to render projects.
    const documentCounts = {};

    const supabaseProjects = rows
  .filter(() => true)
  .map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      lat: sanitizeProjectCoordinate(p, "lat"),
      lon: sanitizeProjectCoordinate(p, "lon"),
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
zip_code: p.zip_code,
created_at: p.created_at,
last_verified: p.last_verified,
source_url: p.source_url || null,
document_count: Number(documentCounts[String(p.id)] || 0)
    }));

    projects = [...supabaseProjects];
    projectsLoading = false;


    // Do not delete saved records based on a partial project page.

    shell();
    renderPage();

    console.log("Loaded Supabase projects:", supabaseProjects.length);
  } catch (error) {
    console.error("Failed to load Supabase projects:", error);

    // Never silently render an empty workspace when the authenticated
    // project query failed. Show the real database error so it can be
    // diagnosed instead of making valid data look like it disappeared.
    projects = [];
    projectsLoading = false;
    shell();
    const main = document.getElementById("main");
    if (main) {
      main.innerHTML = `
        <section class="panel" style="max-width:900px;margin:40px auto;">
          <h1>Unable to load projects</h1>
          <p class="muted">Your account is signed in, but BuildScout could not read the project dataset.</p>
          <p><strong>Database error:</strong> ${esc(error?.message || String(error))}</p>
          <p class="muted">No project data was deleted by this screen. Refresh after the database access issue is fixed.</p>
        </section>`;
    }
  }
}
let page="dashboard", query="", selectedType="All", selectedStage="All", minValue=0;
let map, markerLayer;
let projectMarkers = {};
const app=document.getElementById("app");

function persist(){
  // Imported data is device-local. Saved projects and pipeline state are
  // account data and are persisted through BuildScoutBackend/Supabase.
  localStorage.setItem("bs_imported",JSON.stringify(imported));
}

// Prevent obviously corrupt coordinates from placing U.S. projects in Africa,
// the ocean, or another continent. We keep the project visible in lists and
// allow the detail-map fallback to geocode a selected address when needed.
function sanitizeProjectCoordinate(project, axis){
  const lat=Number(project?.latitude);
  const lon=Number(project?.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return null;
  if(Math.abs(lat)>90||Math.abs(lon)>180) return null;

  const city=String(project?.city||"").toLowerCase();
  const state=String(project?.state||project?.state_code||"").toLowerCase();
  const isKnownUSCity=
    /(^|, )?(dallas|fort worth|austin|chicago|new york|seattle|houston|arlington|plano|frisco|irving|garland|mckinney|denver|phoenix|san antonio|san diego|los angeles|miami|boston|atlanta|nashville|charlotte|detroit|tampa|orlando)/.test(city) ||
    /^(tx|il|ny|wa|co|az|ca|fl|ga|tn|nc|mi|ma)$/.test(state);

  if(isKnownUSCity && (lat<24 || lat>50 || lon<-125 || lon>-66)) return null;
  return axis==="lat" ? lat : lon;
}
function money(n){if(!n)return "—"; return n>=1e6?`$${(n/1e6).toFixed(1)}M`:`$${Number(n).toLocaleString()}`}
function calculateOpportunityScore(p){
  let score = 0;

  const value = Number(p.estimated_value || p.value || 0);
  const stage = String(p.stage || "").toLowerCase();
  const type = String(p.project_type || p.type || "").toLowerCase();

  // PROJECT VALUE
  if (value >= 25000000) score += 20;
  else if (value >= 10000000) score += 17;
  else if (value >= 5000000) score += 14;
  else if (value >= 1000000) score += 10;
  else if (value >= 500000) score += 6;
  else if (value > 0) score += 3;

  // PROJECT STAGE
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

  // PROJECT TYPE
  if (type.includes("multifamily")) score += 10;
  else if (type.includes("mixed")) score += 9;
  else if (type.includes("commercial")) score += 8;
  else if (type.includes("industrial")) score += 8;
  else if (type.includes("residential")) score += 5;

  // PROJECT TEAM
  if (p.general_contractor || p.gc) score += 5;
  if (p.developer) score += 5;

  // PERMIT / LOCATION DATA
  if (p.permit_number) score += 3;
  if (p.street_address) score += 2;
// DATA FRESHNESS
const freshDate = p.last_verified || p.created_at;

if (freshDate) {
  const ageDays =
    (Date.now() - new Date(freshDate).getTime()) /
    (1000 * 60 * 60 * 24);

  if (ageDays <= 30) score += 12;
  else if (ageDays <= 90) score += 8;
  else if (ageDays <= 180) score += 4;
}
  // LOCATION QUALITY
  if (
    Number.isFinite(Number(p.latitude || p.lat)) &&
    Number.isFinite(Number(p.longitude || p.lon))
  ) {
    score += 5;
  }

  // SOURCE QUALITY
  if (p.source_name || p.source) {
    score += 5;
  }

  // TEAM COMPLETENESS BONUS
  if (
    (p.general_contractor || p.gc) &&
    p.developer
  ) {
    score += 3;
  }

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
        ${navBtn("dashboard","▦ Project Map")}
        ${navBtn("projects","◉ Find Projects")}
        ${navBtn("saved",`★ Saved (${saved.length})`)}
        ${navBtn("pipeline","▤ Pipeline")}
        ${navBtn("alerts","◇ Alerts")}
        ${navBtn("marketplace","⚒ Marketplace")}
      </div>
      <div class="side-label">Find projects</div>
      <div class="quick">
        <button onclick="quick('All')">All projects</button>
        ${["Multifamily","Commercial","Industrial","Mixed-use","Residential"].map(x=>`<button onclick="quick('${x}')">${x}</button>`).join("")}
      </div>
      <div class="note">BuildScout turns verified construction signals into sales opportunities, project teams, plans, and next actions.</div>
    </aside>
    <main class="main" id="main"></main>
  </div>`;
  document.getElementById("globalSearch").addEventListener("input",e=>{query=e.target.value;renderPage()});
}
function navBtn(id,label){return `<button class="${page===id?"active":""}" onclick="go('${id}')">${label}</button>`}
function go(p){page=p;shell();renderPage()}
function quick(x){selectedType=x;selectedStage="All";page="projects";shell();renderPage()}
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

const value = Number(p.value || p.estimated_value || 0);
const stageText = String(p.stage || "").toLowerCase();
const typeText = String(p.type || p.project_type || "").toLowerCase();

let valuePoints = 0;
if (value >= 25000000) valuePoints = 20;
else if (value >= 10000000) valuePoints = 17;
else if (value >= 5000000) valuePoints = 14;
else if (value >= 1000000) valuePoints = 10;
else if (value >= 500000) valuePoints = 6;
else if (value > 0) valuePoints = 3;

let stagePoints = 0;

if (
  stageText.includes("pre-construction") ||
  stageText.includes("preconstruction")
) {
  stagePoints = 20;
} else if (stageText.includes("permit approved")) {
  stagePoints = 18;
} else if (stageText.includes("planning")) {
  stagePoints = 17;
} else if (stageText.includes("permit")) {
  stagePoints = 14;
} else if (stageText.includes("construction")) {
  stagePoints = 8;
}
let typePoints = 0;
if (typeText.includes("multifamily")) typePoints = 10;
else if (typeText.includes("commercial")) typePoints = 8;
else if (typeText.includes("industrial")) typePoints = 8;
else if (typeText.includes("mixed")) typePoints = 9;
else if (typeText.includes("residential")) typePoints = 5;

const contractorPoints = (p.general_contractor || p.gc) ? 5 : 0;
const developerPoints = p.developer ? 5 : 0;
const permitPoints = p.permit_number ? 3 : 0;
const addressPoints = p.street_address ? 2 : 0;

const freshDate = p.last_verified || p.created_at;
let freshnessPoints = 0;

if (freshDate) {
  const ageDays =
    (Date.now() - new Date(freshDate).getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 30) freshnessPoints = 12;
  else if (ageDays <= 90) freshnessPoints = 8;
  else if (ageDays <= 180) freshnessPoints = 4;
}

const locationPoints =
  Number.isFinite(Number(p.lat)) &&
  Number.isFinite(Number(p.lon))
    ? 5
    : 0;

const sourcePoints =
  p.source && p.source !== "Unknown source"
    ? 5
    : 0;

const teamCompletenessPoints =
  (p.developer && (p.general_contractor || p.gc))
    ? 3
    : 0;

const knownPoints =
  valuePoints +
  stagePoints +
  typePoints +
  contractorPoints +
  developerPoints +
  permitPoints +
  addressPoints +
  freshnessPoints +
  locationPoints +
  sourcePoints +
  teamCompletenessPoints;

const basePoints = Math.max(0, score - knownPoints);

let opportunityLabel = "WATCH";
let opportunityText =
  "This project may be worth monitoring as more information becomes available.";

if (score >= 90) {
  opportunityLabel = "HOT";
  opportunityText =
    "Top-priority opportunity. Strong project signals indicate this lead deserves immediate attention.";
} else if (score >= 80) {
  opportunityLabel = "STRONG";
  opportunityText =
    "Strong opportunity. Review the project team, permit details, and timing for outreach.";
} else if (score >= 65) {
  opportunityLabel = "WATCH";
  opportunityText =
    "Good developing opportunity. Monitor the project and watch for new activity.";
} else {
  opportunityLabel = "LOW";
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

  <b style="font-size:20px;">
    ${score}/100
  </b>

  <div style="
    margin-top:6px;
    font-size:12px;
    font-weight:800;
  ">
    ${opportunityLabel}
  </div>
</div>

          <div class="stat">
            <small>Permit number</small>
            <b>${esc(p.permit_number || "—")}</b>
          </div>
        </div>
<div class="panel" style="margin-top:14px;">
  <h3 style="margin-bottom:12px;">Why this score?</h3>

  <div style="
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:8px;
  ">

    <div class="stat">
      <small>Project value</small>
      <b>+${valuePoints}</b>
    </div>

    <div class="stat">
      <small>Project stage</small>
      <b>+${stagePoints}</b>
    </div>

    <div class="stat">
      <small>Project type</small>
      <b>+${typePoints}</b>
    </div>

    <div class="stat">
      <small>Contractor identified</small>
      <b>+${contractorPoints}</b>
    </div>

    <div class="stat">
      <small>Developer identified</small>
      <b>+${developerPoints}</b>
    </div>

    <div class="stat">
      <small>Permit data</small>
      <b>+${permitPoints}</b>
    </div>

    <div class="stat">
      <small>Address data</small>
      <b>+${addressPoints}</b>
    </div>
<div class="stat">
  <small>Data freshness</small>
  <b>+${freshnessPoints}</b>
</div>

<div class="stat">
  <small>Location quality</small>
  <b>+${locationPoints}</b>
</div>

<div class="stat">
  <small>Source quality</small>
  <b>+${sourcePoints}</b>
</div>

<div class="stat">
  <small>Team completeness</small>
  <b>+${teamCompletenessPoints}</b>
</div>

<div class="stat">
  <small>Other signals</small>
  <b>+${basePoints}</b>
</div>
  
  </div>

  <div style="
    margin-top:14px;
    padding-top:12px;
    border-top:1px solid rgba(255,255,255,.1);
  ">
    <b>${opportunityLabel}</b>
    <div class="muted" style="margin-top:5px;">
      ${opportunityText}
    </div>
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

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
          <button class="btn primary" onclick="toggleSave('${p.id}')">${isSaved ? "Saved" : "Save project"}</button>
          <button class="btn secondary" onclick="addProjectToPipeline('${p.id}');document.getElementById('modal')?.remove()">Add to pipeline</button>
          <button class="btn secondary" onclick="openProjectIntelligence('${p.id}',${JSON.stringify(projectIdentity(p))})">Project intelligence</button>
          <button class="btn secondary" onclick="openScopeBuilder('${p.id}',${JSON.stringify(p.name || "Project")})">Build scope</button>
          <button class="btn secondary" onclick="BuildScoutProjectDocuments.open('${p.id}',${JSON.stringify(p.name || "Project")})">Plans & Specs</button>
          <button class="btn primary" onclick="BuildScoutCRM.open('${p.id}');document.getElementById('modal')?.remove()">Sales CRM</button>
          <button class="btn secondary" onclick="showProjectOnMap('${p.id}')">Show on map</button>
        </div>
      </div>
    </div>
  `);
}
async function toggleSave(id){
  try{
    const userId=currentSession?.user?.id;
    if(!userId){
      renderAuthScreen("Please sign in again.");
      return;
    }

    const projectId=String(id);
    if(saved.includes(projectId)){
      await BuildScoutBackend.unsaveProject(userId,projectId);
      saved=saved.filter(x=>String(x)!==projectId);
    }else{
      await BuildScoutBackend.saveProject(userId,projectId);
      saved=[...saved,projectId];
    }

    document.getElementById("modal")?.remove();
    shell();
    renderPage();
  }catch(error){
    console.error("Failed to update saved project:",error);
    alert("Unable to update saved project: "+(error?.message||error));
  }
}

function addPipeline(id){
  return addProjectToPipeline(String(id));
}

function projectIdentity(p){
  const raw=String(p.name||"").trim();
  const generic=!raw||/^permit\b/i.test(raw)||/^#?[a-z0-9-]+$/i.test(raw);
  if(!generic)return raw;
  if(p.street_address)return `${p.street_address} — ${p.type||"Construction"}`;
  return `${p.type||"Construction"} opportunity in ${p.city||"this market"}`;
}
function projectReadiness(p){
  const plans=Number(p.document_count||0)>0;
  const gc=Boolean(p.gc);
  const developer=Boolean(p.developer);
  const value=Number(p.value||0)>0;
  const address=Boolean(p.street_address);
  const team=gc||developer;
  const known=[plans,team,value,address].filter(Boolean).length;
  return {plans,gc,developer,team,value,address,known,label:known>=3?"Sales ready":known===2?"Developing":"Needs enrichment"};
}
function nextMove(p){
  const q=projectReadiness(p);
  if(q.plans&&q.team)return "Review plans and contact the project team";
  if(q.plans)return "Review plans, then identify the decision maker";
  if(q.team)return "Contact the project team and request plans";
  return "Verify the project team and locate plan documents";
}
function projectCard(p){
  const q=projectReadiness(p);
  return `<article class="project-card opportunity-card" id="project-card-${p.id}">
    <div class="opportunity-card-top"><div><span class="tag">${esc(p.type||"Construction")}</span><span class="tag">${esc(p.stage||"Unknown stage")}</span></div><div class="score">${p.score||0}/100</div></div>
    <h3>${esc(projectIdentity(p))}</h3>
    <div class="muted">${esc([p.street_address,p.city].filter(Boolean).join(", ")||"Location unavailable")}</div>
    <div class="opportunity-facts"><div><small>Value</small><b>${money(p.value)}</b></div><div><small>Project team</small><b>${q.team?"Identified":"Research needed"}</b></div><div><small>Plans</small><b>${q.plans?`${p.document_count} available`:"Not found yet"}</b></div></div>
    <div class="opportunity-next"><small>BUILDSCOUT NEXT MOVE</small><b>${esc(nextMove(p))}</b></div>
    <div class="opportunity-source"><span class="confidence-pill ${q.known>=3?"good":q.known===2?"mid":"low"}">${q.label}</span><span>${esc(p.source||"Unknown source")}${p.permit_number?` · Permit ${esc(p.permit_number)}`:""}</span></div>
    <div class="opportunity-actions"><button class="btn primary" onclick="viewProject('${p.id}')">Open project</button><button class="btn secondary" onclick="openProjectIntelligence('${p.id}',${JSON.stringify(projectIdentity(p))})">Intelligence</button>${q.plans?`<button class="btn secondary" onclick="BuildScoutProjectDocuments.open('${p.id}',${JSON.stringify(p.name||"Project")})">View plans</button>`:""}<button class="btn secondary" onclick="toggleSave('${p.id}')">${saved.includes(p.id)?"Saved":"Save"}</button></div>
  </article>`;
}
async function focusProjectOnMap(id){
  const project = projects.find(p => String(p.id) === String(id));
  if (!project || !map || !markerLayer) return false;

  let lat = Number(project.lat);
  let lon = Number(project.lon);

  const city = String(project.city || "").toLowerCase();
  const address = [project.street_address, project.city, project.zip_code].filter(Boolean).join(", ");
  const austinCoordsSuspect =
    city.includes("austin") &&
    (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < 29.6 || lat > 30.7 || lon < -98.4 || lon > -96.9);

  if ((!Number.isFinite(lat) || !Number.isFinite(lon) || austinCoordsSuspect) && address) {
    try {
      const cacheKey = "bs_geocode_" + address.toLowerCase();
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.lat && cached?.lon) {
        lat = Number(cached.lat);
        lon = Number(cached.lon);
      } else {
        const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(address);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const results = await response.json();
        if (results?.[0]) {
          lat = Number(results[0].lat);
          lon = Number(results[0].lon);
          localStorage.setItem(cacheKey, JSON.stringify({lat, lon, address}));
        }
      }
    } catch (error) {
      console.warn("Address geocoding fallback failed:", error);
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  // Never persist a coordinate that fails the same plausibility check used
  // when projects are loaded from Supabase.
  if (sanitizeProjectCoordinate({
    city: project.city,
    latitude: lat,
    longitude: lon
  }, "lat") === null ||
      sanitizeProjectCoordinate({
        city: project.city,
        latitude: lat,
        longitude: lon
      }, "lon") === null) {
    return false;
  }

  project.lat = lat;
  project.lon = lon;

  const oldMarker = projectMarkers[project.id];
  if (oldMarker) oldMarker.remove();

  const marker = L.marker([lat, lon]).addTo(markerLayer);
  projectMarkers[project.id] = marker;
  marker.bindPopup(
    "<b>" + esc(project.name || "Project") + "</b><br>" +
    esc(project.city || "") + "<br>" +
    money(project.value) + " • " + (project.score || 0) + "/100"
  );

  map.setView([lat, lon], 15, { animate: true });
  marker.openPopup();
  highlightProjectCard(project.id);
  return true;
}
async function showProjectOnMap(id){
  const project = projects.find(p => String(p.id) === String(id));
  if (!project) return;

  document.getElementById("modal")?.remove();
  query = "";
  selectedType = "All";
  selectedStage = "All";
  minValue = 0;
  page = "dashboard";
  shell();

  // Set the focus before renderPage() initializes Leaflet so the selected
  // project is the only marker and the map fits directly to it.
  const mapHost = document.getElementById("map");
  if (mapHost) {
    mapHost.dataset.focusProjectId = String(id);
  }

  // The normal Project Map navigation remains the all-project map.
  renderPage();

  let attempts = 0;
  const tryFocus = async () => {
    attempts += 1;
    if (await focusProjectOnMap(id)) return;
    if (attempts < 25) setTimeout(tryFocus, 150);
  };

  // initMap may fit its marker set during startup; run after it and keep the
  // selected project isolated from the normal all-project map.
  setTimeout(tryFocus, 450);
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
  if(page==="home"){
    const pipelineCount=Object.keys(pipeline).length;
    const planReady=projects.filter(p=>p.has_plans||p.plan_count||p.document_count).length;
    const teamReady=projects.filter(p=>p.general_contractor||p.gc||p.developer).length;
    main.innerHTML=`
      <section class="bs-home-hero">
        <div>
          <div class="bs-eyebrow">CONSTRUCTION SALES INTELLIGENCE</div>
          <h1>Find the right projects. Know who to call. Win more work.</h1>
          <p>BuildScout brings verified project signals, project teams, plans and documents, and your sales workflow into one place—then uses intelligence to help you decide what to pursue next.</p>
          <div class="bs-home-actions">
            <button class="btn primary" onclick="go('projects')">Find Projects</button>
            <button class="btn secondary" onclick="go('pipeline')">Open Pipeline</button>
          </div>
        </div>
        <div class="bs-home-score">
          <span>YOUR WORKSPACE</span>
          <b>${projects.length.toLocaleString()}</b>
          <small>projects available</small>
          <div><strong>${saved.length}</strong> saved · <strong>${pipelineCount}</strong> in pipeline</div>
        </div>
      </section>
      <section class="bs-home-grid">
        <button class="bs-feature" onclick="go('projects')"><span>01</span><h3>Discover real opportunities</h3><p>Search construction projects by market, type, stage and value instead of digging through raw permit records.</p><b>Find projects →</b></button>
        <button class="bs-feature" onclick="go('projects')"><span>02</span><h3>Understand the project</h3><p>See the owner, developer, GC, source signals and project details together so you know what is real and what is missing.</p><b>${teamReady.toLocaleString()} projects with team data →</b></button>
        <button class="bs-feature" onclick="go('projects')"><span>03</span><h3>Plans where they matter</h3><p>Open authorized plans, specifications and addenda from the project itself. Plan availability is shown clearly instead of hidden behind permit data.</p><b>${planReady.toLocaleString()} currently flagged with documents →</b></button>
        <button class="bs-feature" onclick="go('pipeline')"><span>04</span><h3>Turn intelligence into action</h3><p>Save an opportunity, move it through your pipeline, keep notes and follow-ups, and use BuildScout intelligence to focus outreach.</p><b>Work your pipeline →</b></button>
      </section>
      <section class="panel bs-home-how">
        <div><div class="bs-eyebrow">WHY BUILDSCOUT</div><h2>From scattered construction data to a clear next move.</h2></div>
        <div class="bs-steps"><span><b>1</b> Discover</span><span><b>2</b> Verify</span><span><b>3</b> View plans & team</span><span><b>4</b> Contact</span><span><b>5</b> Track & win</span></div>
      </section>`;
  } else if(page==="marketplace"){ BuildScoutMarketplace.render(main); return;
  } else if(page==="dashboard"){
    if (projectsLoading && projects.length === 0) {
      main.innerHTML=`<div class="pagehead"><div><h1>Project Map</h1><div class="muted">Loading verified construction projects…</div></div></div><div class="panel" style="padding:40px;text-align:center;"><h2>Loading projects…</h2><p class="muted">BuildScout is loading the project dataset.</p></div>`;
      return;
    }
    const ps = filtered().sort((a, b) => (b.score || 0) - (a.score || 0));
    main.innerHTML=`<div class="pagehead"><div><h1>Project Map</h1><div class="muted">Explore construction opportunities and open a project to see the intelligence behind it.</div></div></div>
      <div class="statline">
        <div class="stat"><small>Matching projects</small><b>${ps.length}</b></div>
      <div class="stat"><small>Imported records</small><b>${projects.length}</b></div>
        <div class="stat"><small>Saved projects</small><b>${saved.length}</b></div>
        <div class="stat"><small>High-opportunity</small><b>${ps.filter(p=>(p.score||0)>=75).length}</b></div>
      </div>${filterBar()}
      <div class="map-wrap"><div id="map"></div><div class="listpanel">${ps.map(projectCard).join("")||"<div class='muted'>No projects match.</div>"}</div></div>`;
    setTimeout(()=>initMap(ps),0);
  } else if(page==="projects"){
    if (projectsLoading && projects.length === 0) {
      main.innerHTML=`<div class="pagehead"><div><h1>Find Projects</h1><div class="muted">Loading verified construction projects…</div></div></div><div class="panel" style="padding:40px;text-align:center;"><h2>Loading projects…</h2><p class="muted">BuildScout is loading the project dataset.</p></div>`;
      return;
    }
    main.innerHTML=`<div class="pagehead"><div><h1>Find Projects</h1><div class="muted">Discover opportunities, project teams, plans and the signals that make a project worth pursuing.</div></div></div>${filterBar()}<div class="grid">${filtered().map(projectCard).join("")}</div>`;
  } else if(page==="saved"){
    const ps=projects.filter(p=>saved.includes(String(p.id)));
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

  const focusId = document.getElementById("map")?.dataset.focusProjectId || null;
  const mapProjects = focusId
    ? ps.filter(p => String(p.id) === String(focusId))
    : ps;
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
  mapProjects
  .filter(p => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
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
        maxZoom: focusId ? 16 : 11
      });
    }
  }
}, 250);
}
async function openProjectIntelligence(projectId, projectName){
  try {
    if (window.BuildScoutIntelligence?.open) {
      await window.BuildScoutIntelligence.open(projectId, projectName);
      return;
    }
    alert("Project Intelligence is not loaded. Please refresh BuildScout.");
  } catch (error) {
    console.error("Project Intelligence failed:", error);
    alert("Project Intelligence could not open. Check the browser console for details.");
  }
}
async function openScopeBuilder(projectId, projectName){
  try {
    if (window.BuildScoutScope?.open) {
      await window.BuildScoutScope.open(projectId, projectName);
      return;
    }
    alert("Scope Builder is not loaded. Please refresh BuildScout.");
  } catch (error) {
    console.error("Scope Builder failed:", error);
    alert("Scope Builder could not open. Check the browser console for details.");
  }
}

// Inline card handlers call these through the global window object.
window.viewProject=viewProject;
window.toggleSave=toggleSave;
window.addPipeline=addPipeline;
window.addProjectToPipeline=addProjectToPipeline;
window.openProjectIntelligence=openProjectIntelligence;
window.openScopeBuilder=openScopeBuilder;
window.showProjectOnMap=showProjectOnMap;

// Start the BuildScout application after all runtime scripts are loaded.
bootBuildScout();
