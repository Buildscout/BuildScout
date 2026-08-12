// BuildScout dashboard score intelligence
// Adds score distribution and a sales-priority queue without changing app.js.

(function () {
  function intel() { return window.BuildScoutScoreIntelligence; }
  function currentProjects() {
    try { return typeof projects !== "undefined" && Array.isArray(projects) ? projects : []; }
    catch (_) { return []; }
  }
  function money(value) {
    const n = Number(value || 0);
    if (!n) return "—";
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    return `$${Math.round(n).toLocaleString()}`;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function ageDays(project) {
    const raw = project.last_verified || project.created_at;
    if (!raw) return null;
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return null;
    return Math.max(0, (Date.now() - date.getTime()) / 86400000);
  }
  function salesPriority(project) {
    const reasons = [];
    let priority = Number(project.score || 0) * 0.62;
    const stage = String(project.stage || "").toLowerCase();
    const value = Number(project.value || 0);
    const age = ageDays(project);

    if (stage.includes("pre-construction") || stage.includes("preconstruction")) { priority += 18; reasons.push("Pre-construction timing"); }
    else if (stage.includes("permit approved")) { priority += 16; reasons.push("Permit approved"); }
    else if (stage.includes("planning")) { priority += 14; reasons.push("Planning-stage opportunity"); }
    else if (stage.includes("permit")) { priority += 11; reasons.push("Active permit signal"); }
    else if (stage.includes("construction")) { priority += 5; reasons.push("Active construction"); }

    if (age !== null && age <= 30) { priority += 10; reasons.push("Fresh data"); }
    else if (age !== null && age <= 90) { priority += 6; reasons.push("Recently verified"); }

    if (value >= 10000000) { priority += 8; reasons.push("$10M+ project"); }
    else if (value >= 5000000) { priority += 6; reasons.push("$5M+ project"); }
    else if (value >= 1000000) { priority += 4; reasons.push("$1M+ project"); }

    if (project.gc || project.contractor || project.general_contractor) { priority += 5; reasons.push("GC identified"); }
    else { priority += 2; reasons.push("GC research opportunity"); }
    if (project.developer) { priority += 4; reasons.push("Developer identified"); }
    if (project.permit_number) priority += 2;

    return { priority: Math.min(100, Math.round(priority)), reasons: reasons.slice(0, 3) };
  }
  function priorityProjects(projectList) {
    return projectList.map(project => ({ project, sales: salesPriority(project) }))
      .sort((a,b) => b.sales.priority - a.sales.priority || Number(b.project.score||0) - Number(a.project.score||0)).slice(0,5);
  }
  function renderPriorityQueue(projectList) {
    const scoreIntel = intel();
    if (!scoreIntel) return "";
    const top = priorityProjects(projectList);
    if (!top.length) return "";
    return `<div class="panel" style="margin:14px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;"><div><h3 style="margin:0 0 5px;">Call first</h3><div class="muted">Ranked by sales urgency: opportunity score, timing, freshness, value, and contactability.</div></div><button class="btn" onclick="go('projects')">View all projects</button></div>
      <div style="display:grid;gap:8px;margin-top:14px;">${top.map(({project,sales},index)=>{ const tier=scoreIntel.tierForScore(project.score); return `
        <button type="button" onclick="viewProject('${String(project.id).replace(/'/g,"\\'")}')" style="width:100%;text-align:left;background:#0d1d28;border:1px solid #203746;border-radius:10px;padding:12px 14px;color:white;cursor:pointer;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;">
          <div style="font-size:18px;font-weight:900;color:#ff9f32;">#${index+1}</div><div style="min-width:0;"><div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(project.name||"Unnamed project")}</div><div class="muted" style="margin-top:3px;font-size:13px;">${escapeHtml(project.city||"Unknown city")} · ${escapeHtml(project.stage||"Unknown stage")} · ${money(project.value)}</div><div style="margin-top:6px;font-size:12px;color:#b9cad5;">${sales.reasons.map(escapeHtml).join(" · ")}</div></div>
          <div style="text-align:right;"><div style="font-size:11px;color:#9fb1bd;text-transform:uppercase;">Call priority</div><div style="font-size:22px;font-weight:900;color:#ff9f32;">${sales.priority}</div><div style="font-size:11px;margin:2px 0 5px;color:#9fb1bd;">Opportunity ${scoreIntel.normalizeScore(project.score)}</div><span style="display:inline-block;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:800;${tier.cardStyle}">${tier.label}</span></div>
        </button>`; }).join("")}</div></div>`;
  }
  function renderDashboardIntelligence() {
    const scoreIntel=intel(), projectList=currentProjects();
    if (!scoreIntel || !projectList.length) return "";
    const stats=scoreIntel.distribution(projectList);
    return `<section id="buildScoutDashboardIntelligence" style="margin:16px 0 22px;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;"><div class="stat"><small>Average score</small><b>${stats.average}/100</b></div><div class="stat"><small>Median score</small><b>${stats.median}/100</b></div><div class="stat"><small>HOT leads</small><b>${stats.hot}</b></div><div class="stat"><small>STRONG leads</small><b>${stats.strong}</b></div><div class="stat"><small>High opportunity</small><b>${stats.highOpportunity}</b></div></div>${scoreIntel.renderDistribution(projectList)}${renderPriorityQueue(projectList)}</section>`;
  }
  function inject() {
    try { if (typeof page === "undefined" || page !== "dashboard") return; if (document.getElementById("buildScoutDashboardIntelligence")) return; const html=renderDashboardIntelligence(); if(!html)return; const main=document.querySelector("main"); if(!main)return; const anchor=main.querySelector(".stats")||main.firstElementChild; if(anchor)anchor.insertAdjacentHTML("afterend",html); else main.insertAdjacentHTML("afterbegin",html); }
    catch(error){ console.warn("BuildScout dashboard intelligence could not render:",error); }
  }
  const observer=new MutationObserver(()=>window.requestAnimationFrame(inject)); observer.observe(document.documentElement,{childList:true,subtree:true}); window.addEventListener("load",inject); setTimeout(inject,0);
  window.BuildScoutDashboardIntelligence={renderDashboardIntelligence,renderPriorityQueue,salesPriority,inject};
})();
