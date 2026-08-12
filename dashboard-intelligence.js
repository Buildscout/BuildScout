// BuildScout dashboard score intelligence
// Adds score distribution, priority counts, and a top-leads queue without changing app.js.

(function () {
  function intel() {
    return window.BuildScoutScoreIntelligence;
  }

  function currentProjects() {
    try {
      return typeof projects !== "undefined" && Array.isArray(projects) ? projects : [];
    } catch (_) {
      return [];
    }
  }

  function money(value) {
    const n = Number(value || 0);
    if (!n) return "—";
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    return `$${Math.round(n).toLocaleString()}`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function priorityProjects(projectList) {
    return [...projectList]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);
  }

  function renderPriorityQueue(projectList) {
    const scoreIntel = intel();
    if (!scoreIntel) return "";

    const top = priorityProjects(projectList);
    if (!top.length) return "";

    return `
      <div class="panel" style="margin:14px 0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div>
            <h3 style="margin:0 0 5px;">Call first</h3>
            <div class="muted">Highest-scoring opportunities in the current project set.</div>
          </div>
          <button class="btn" onclick="go('projects')">View all projects</button>
        </div>
        <div style="display:grid;gap:8px;margin-top:14px;">
          ${top.map((project, index) => {
            const tier = scoreIntel.tierForScore(project.score);
            return `
              <button
                type="button"
                onclick="viewProject('${String(project.id).replace(/'/g, "\\'")}')"
                style="width:100%;text-align:left;background:#0d1d28;border:1px solid #203746;border-radius:10px;padding:12px 14px;color:white;cursor:pointer;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;"
              >
                <div style="font-size:18px;font-weight:900;color:#ff9f32;">#${index + 1}</div>
                <div style="min-width:0;">
                  <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(project.name || "Unnamed project")}</div>
                  <div class="muted" style="margin-top:3px;font-size:13px;">${escapeHtml(project.city || "Unknown city")} · ${escapeHtml(project.stage || "Unknown stage")} · ${money(project.value)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:20px;font-weight:900;">${scoreIntel.normalizeScore(project.score)}</div>
                  <span style="display:inline-block;margin-top:3px;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:800;${tier.cardStyle}">${tier.label}</span>
                </div>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderDashboardIntelligence() {
    const scoreIntel = intel();
    const projectList = currentProjects();
    if (!scoreIntel || !projectList.length) return "";

    const stats = scoreIntel.distribution(projectList);

    return `
      <section id="buildScoutDashboardIntelligence" style="margin:16px 0 22px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;">
          <div class="stat"><small>Average score</small><b>${stats.average}/100</b></div>
          <div class="stat"><small>Median score</small><b>${stats.median}/100</b></div>
          <div class="stat"><small>HOT leads</small><b>${stats.hot}</b></div>
          <div class="stat"><small>STRONG leads</small><b>${stats.strong}</b></div>
          <div class="stat"><small>High opportunity</small><b>${stats.highOpportunity}</b></div>
        </div>
        ${scoreIntel.renderDistribution(projectList)}
        ${renderPriorityQueue(projectList)}
      </section>
    `;
  }

  function inject() {
    try {
      if (typeof page === "undefined" || page !== "dashboard") return;
      if (document.getElementById("buildScoutDashboardIntelligence")) return;

      const html = renderDashboardIntelligence();
      if (!html) return;

      const main = document.querySelector("main");
      if (!main) return;

      const anchor = main.querySelector(".stats") || main.firstElementChild;
      if (anchor) anchor.insertAdjacentHTML("afterend", html);
      else main.insertAdjacentHTML("afterbegin", html);
    } catch (error) {
      console.warn("BuildScout dashboard intelligence could not render:", error);
    }
  }

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(inject);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", inject);
  setTimeout(inject, 0);

  window.BuildScoutDashboardIntelligence = {
    renderDashboardIntelligence,
    renderPriorityQueue,
    inject
  };
})();
