// BuildScout score intelligence
// Keeps opportunity tiers consistent across cards, dashboard metrics, and project details.

(function () {
  const TIERS = [
    {
      key: "hot",
      label: "HOT",
      min: 75,
      cardStyle: "background:#3b1616;color:#ff6b6b;",
      text: "Top-priority opportunity. Strong project signals indicate this lead deserves immediate attention."
    },
    {
      key: "strong",
      label: "STRONG",
      min: 65,
      cardStyle: "background:#12351f;color:#65e58c;",
      text: "Strong opportunity. Review the project team, permit details, and timing for outreach."
    },
    {
      key: "watch",
      label: "WATCH",
      min: 50,
      cardStyle: "background:#3a2f12;color:#f5c451;",
      text: "Good developing opportunity. Monitor the project and watch for new activity."
    },
    {
      key: "low",
      label: "LOW",
      min: 0,
      cardStyle: "background:#252b33;color:#9ca8b6;",
      text: "This project currently has fewer verified opportunity signals."
    }
  ];

  function normalizeScore(score) {
    const value = Number(score);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  }

  function tierForScore(score) {
    const value = normalizeScore(score);
    return TIERS.find(tier => value >= tier.min) || TIERS[TIERS.length - 1];
  }

  function distribution(projects) {
    const result = {
      total: 0,
      average: 0,
      median: 0,
      highOpportunity: 0,
      hot: 0,
      strong: 0,
      watch: 0,
      low: 0,
      bands: {
        "75-100": 0,
        "65-74": 0,
        "50-64": 0,
        "0-49": 0
      }
    };

    const scores = (projects || [])
      .map(project => normalizeScore(project && project.score))
      .sort((a, b) => a - b);

    result.total = scores.length;
    if (!scores.length) return result;

    result.average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    const middle = Math.floor(scores.length / 2);
    result.median = scores.length % 2
      ? scores[middle]
      : Math.round((scores[middle - 1] + scores[middle]) / 2);

    scores.forEach(score => {
      const tier = tierForScore(score);
      result[tier.key] += 1;

      if (score >= 75) result.bands["75-100"] += 1;
      else if (score >= 65) result.bands["65-74"] += 1;
      else if (score >= 50) result.bands["50-64"] += 1;
      else result.bands["0-49"] += 1;
    });

    result.highOpportunity = result.hot + result.strong;
    return result;
  }

  function renderDistribution(projects) {
    const stats = distribution(projects);
    const rows = [
      ["HOT", "75–100", stats.hot],
      ["STRONG", "65–74", stats.strong],
      ["WATCH", "50–64", stats.watch],
      ["LOW", "0–49", stats.low]
    ];

    return `
      <div class="panel" style="margin:14px 0;">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <h3 style="margin:0 0 5px;">Opportunity distribution</h3>
            <div class="muted">See how the current project set ranks before you start outreach.</div>
          </div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;">
            <div><small class="muted">Average</small><div style="font-size:20px;font-weight:800;">${stats.average}/100</div></div>
            <div><small class="muted">Median</small><div style="font-size:20px;font-weight:800;">${stats.median}/100</div></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px;">
          ${rows.map(([label, range, count]) => `
            <div class="stat">
              <small>${label} · ${range}</small>
              <b>${count}</b>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  window.BuildScoutScoreIntelligence = {
    tiers: TIERS,
    normalizeScore,
    tierForScore,
    distribution,
    renderDistribution
  };
})();
