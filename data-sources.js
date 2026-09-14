window.BuildScoutDataSources = (() => {
  const markets = [
    {country:"United States", region:"Texas", market:"Dallas–Fort Worth", source:"Municipal permit data", status:"Ready", records:0, lastSync:"Not synced"},
    {country:"United States", region:"Texas", market:"Houston", source:"Municipal permit data", status:"Planned", records:0, lastSync:"—"},
    {country:"United States", region:"Texas", market:"Austin", source:"City of Austin — Issued Construction Permits", status:"Live", records:100, lastSync:"Loading…"},
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
    const connected = markets.filter(x=>x.status==="Ready" || x.status==="Live").length;
    const imported = markets.reduce((sum,m)=>sum+(Number(m.records)||0),0);
    return `
      <div class="pagehead">
        <div>
          <h1>North America Data Sources</h1>
          <div class="muted">Manage construction-data coverage across the United States and Canada.</div>
        </div>
        <button class="btn primary" onclick="BuildScoutDataSources.openImport()">Data sync status</button>
      </div>
      <div class="statline">
        <div class="stat"><small>Countries</small><b>2</b></div>
        <div class="stat"><small>Markets configured</small><b>${markets.length}</b></div>
        <div class="stat"><small>Connected / ready</small><b>${connected}</b></div>
        <div class="stat"><small>Source records</small><b>${imported.toLocaleString()}</b></div>
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
            <option>Live</option>
            <option>Ready</option>
            <option>Planned</option>
          </select>
        </div>
        <div id="ds-table"></div>
      </div>
      <div class="panel" style="margin-top:14px">
        <h2>How North America coverage works</h2>
        <p class="muted">BuildScout connects official public or licensed construction sources, normalizes them into one project format, and refreshes verified production records on a controlled schedule.</p>
        <div class="grid">
          <div class="source-card"><h3>1. Connect</h3><p class="muted">Add an official public or licensed construction-data source.</p></div>
          <div class="source-card"><h3>2. Normalize</h3><p class="muted">Map source fields into BuildScout project, company, location, and stage fields.</p></div>
          <div class="source-card"><h3>3. Verify</h3><p class="muted">Preserve provenance, reject malformed records, and keep unknown values unknown.</p></div>
          <div class="source-card"><h3>4. Sync</h3><p class="muted">Server-side jobs insert new projects and update source-owned fields without duplicating records.</p></div>
        </div>
      </div>
    `;
  }

  function badge(status){
    if(status==="Live") return '<span class="badge-good">● Live</span>';
    if(status==="Ready") return '<span class="badge-good">● Ready</span>';
    if(status==="Error") return '<span class="badge-warn">● Error</span>';
    return '<span class="badge-warn">● Planned</span>';
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
        <td>${badge(m.status)}</td>
        <td>${Number(m.records||0).toLocaleString()}</td>
        <td>${esc2(m.lastSync)}</td>
        <td><button class="btn secondary" onclick="BuildScoutDataSources.marketAction('${encodeURIComponent(m.country)}','${encodeURIComponent(m.region)}','${encodeURIComponent(m.market)}')">${m.status==="Live"?"Status":m.status==="Ready"?"Open":"Plan"}</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  function render(){
    const main=document.getElementById("main");
    if(!main) return;
    main.innerHTML=sourcePageHTML();
    filter();
    refreshStatus();
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

  async function refreshStatus(){
    const austin=markets.find(m=>m.market==="Austin");
    if(!austin) return;
    try{
      const response=await fetch("/api/sync-status");
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const status=data?.sources?.austin;
      if(status){
        austin.status="Live";
        austin.records=Number(status.records||0);
        const latest=status.latestSync;
        if(latest?.completed_at){
          austin.lastSync=`${new Date(latest.completed_at).toLocaleString()} · ${latest.status}`;
        }else{
          austin.lastSync="Live source · telemetry pending";
        }
      }
    }catch(error){
      austin.lastSync="Status unavailable";
    }
    filter();
  }

  function openImport(){
    const austin=markets.find(m=>m.market==="Austin");
    alert(`Austin is live with ${Number(austin?.records||0).toLocaleString()} source-backed projects. Production syncing now runs through the protected server-side ingestion endpoint.`);
  }

  function marketAction(country,region,market){
    country=decodeURIComponent(country); region=decodeURIComponent(region); market=decodeURIComponent(market);
    const row=markets.find(m=>m.market===market && m.region===region && m.country===country);
    if(row?.status==="Live"){
      alert(`${market} is live. Records: ${Number(row.records||0).toLocaleString()}. Last sync: ${row.lastSync}.`);
      return;
    }
    alert(`${market}, ${region} (${country}) is configured in the North America market plan. Its official/licensed connector is not live yet.`);
  }

  function esc2(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  return {render,filter,refreshStatus,openImport,marketAction,markets};
})();
