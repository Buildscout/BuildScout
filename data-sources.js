
window.BuildScoutDataSources = (() => {
  const markets = [
    {country:"United States", region:"Texas", market:"Dallas–Fort Worth", source:"Municipal permit data", status:"Ready", records:0, lastSync:"Not synced"},
    {country:"United States", region:"Texas", market:"Houston", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Texas", market:"Austin", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Texas", market:"San Antonio", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Florida", market:"Miami–Fort Lauderdale", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Georgia", market:"Atlanta", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Arizona", market:"Phoenix", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Colorado", market:"Denver", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Illinois", market:"Chicago", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"New York", market:"New York City", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"Ontario", market:"Toronto", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"Ontario", market:"Ottawa", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"British Columbia", market:"Vancouver", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"Alberta", market:"Calgary", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"Alberta", market:"Edmonton", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"Canada", region:"Quebec", market:"Montréal", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"}
  ];

  function sourcePageHTML(){
    return `
      <div class="pagehead">
        <div>
          <h1>North America Data Sources</h1>
          <div class="muted">Manage construction-data coverage across the United States and Canada.</div>
        </div>
        <button class="btn primary" onclick="BuildScoutDataSources.openImport()">Import permit data</button>
      </div>
      <div class="statline">
        <div class="stat"><small>Countries</small><b>2</b></div>
        <div class="stat"><small>Markets configured</small><b>${markets.length}</b></div>
        <div class="stat"><small>Connected / ready</small><b>${markets.filter(x=>x.status==="Ready").length}</b></div>
        <div class="stat"><small>Imported records</small><b>${(window.imported||[]).length || 0}</b></div>
      </div>
      <div class="panel">
        <div class="filterbar">
          <input id="ds-search" placeholder="Search country, state/province, city..." oninput="BuildScoutDataSources.filter()">
          <select id="ds-country" onchange="BuildScoutDataSources.filter()">
            <option value="All">All countries</option>
            <option>United States</option>
            <option>Canada</option>
          </select>
          <select id="ds-status" onchange="BuildScoutDataSources.filter()">
            <option value="All">All statuses</option>
            <option>Ready</option>
            <option>Planned</option>
          </select>
        </div>
        <div id="ds-table"></div>
      </div>
      <div class="panel" style="margin-top:14px">
        <h2>How North America coverage works</h2>
        <p class="muted">BuildScout is structured to support the full U.S. and Canada. Each city, county, state/province, or licensed data provider can be added as a source connector. Records are normalized into one BuildScout project format before appearing on the map.</p>
        <div class="grid">
          <div class="source-card"><h3>1. Connect</h3><p class="muted">Add an official public or licensed construction-data source.</p></div>
          <div class="source-card"><h3>2. Normalize</h3><p class="muted">Map permit fields into BuildScout project, company, location, and stage fields.</p></div>
          <div class="source-card"><h3>3. Score</h3><p class="muted">Calculate opportunity priority from size, stage, trade fit, freshness, and territory.</p></div>
          <div class="source-card"><h3>4. Sell</h3><p class="muted">Users save opportunities, manage pipeline stages, and receive alerts.</p></div>
        </div>
      </div>
    `;
  }

  function tableHTML(rows){
    return `<div style="overflow:auto"><table><thead><tr>
      <th>Country</th><th>State / Province</th><th>Market</th><th>Source</th><th>Status</th><th>Records</th><th>Last sync</th><th></th>
    </tr></thead><tbody>${rows.map(m=>`
      <tr>
        <td>${esc2(m.country)}</td>
        <td>${esc2(m.region)}</td>
        <td><b>${esc2(m.market)}</b></td>
        <td>${esc2(m.source)}</td>
        <td>${m.status==="Ready" ? '<span class="badge-good">● Ready</span>' : '<span class="badge-warn">● Planned</span>'}</td>
        <td>${m.records}</td>
        <td>${m.lastSync}</td>
        <td><button class="btn secondary" onclick="BuildScoutDataSources.marketAction('${encodeURIComponent(m.country)}','${encodeURIComponent(m.region)}','${encodeURIComponent(m.market)}')">${m.status==="Ready"?"Open":"Plan"}</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  function render(){
    const main=document.getElementById("main");
    if(!main) return;
    main.innerHTML=sourcePageHTML();
    filter();
  }

  function filter(){
    const q=(document.getElementById("ds-search")?.value||"").toLowerCase();
    const country=document.getElementById("ds-country")?.value||"All";
    const status=document.getElementById("ds-status")?.value||"All";
    const rows=markets.filter(m=>{
      const hay=`${m.country} ${m.region} ${m.market} ${m.source}`.toLowerCase();
      return (!q || hay.includes(q)) && (country==="All" || m.country===country) && (status==="All" || m.status===status);
    });
    const target=document.getElementById("ds-table");
    if(target) target.innerHTML=tableHTML(rows);
  }

  function openImport(){
    alert("Use BuildScout's CSV/JSON import workflow for the first beta connectors. Automated source syncing comes next.");
  }

  function marketAction(country,region,market){
    country=decodeURIComponent(country); region=decodeURIComponent(region); market=decodeURIComponent(market);
    alert(`${market}, ${region} (${country}) is configured in the North America market plan. We can connect its public/licensed source as we expand coverage.`);
  }

  function esc2(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  return {render,filter,openImport,marketAction,markets};
})();
