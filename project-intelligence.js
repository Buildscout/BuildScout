// BuildScout Phase 24 — verified project intelligence panel
(function(){
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const clean=v=>String(v||"").trim();
  function badge(confidence){const c=clean(confidence)||"unknown";return `<span class="intel-confidence ${esc(c)}">${esc(c.replace("-"," "))}</span>`;}
  async function open(projectId,projectName){
    const old=document.getElementById("buildScoutIntelligenceModal");if(old)old.remove();
    const modal=document.createElement("div");modal.id="buildScoutIntelligenceModal";modal.className="intel-modal";
    modal.innerHTML=`<div class="intel-box"><button class="close" onclick="BuildScoutIntelligence.close()">×</button><div class="bs-eyebrow">VERIFIED PROJECT INTELLIGENCE</div><h2>${esc(projectName||"Project")}</h2><div id="intelBody" class="muted">Loading project team, contacts and source evidence…</div></div>`;
    document.body.appendChild(modal);
    try{
      const [intel,docs]=await Promise.all([BuildScoutBackend.getProjectIntelligence(projectId),BuildScoutBackend.getProjectDocuments(projectId)]);
      const companies=intel.companies||[],contacts=intel.contacts||[],sources=intel.sources||[];
      document.getElementById("intelBody").innerHTML=`
        <div class="intel-summary"><div><small>Companies</small><b>${companies.length}</b></div><div><small>Contacts</small><b>${contacts.length}</b></div><div><small>Plans & docs</small><b>${docs.length}</b></div><div><small>Source signals</small><b>${sources.length}</b></div></div>
        <section class="intel-section"><div class="intel-title"><h3>Project team</h3><span>Only source-backed names are shown</span></div>${companies.length?`<div class="intel-list">${companies.map(x=>`<article><div><small>${esc(x.role)}</small><b>${esc(x.company_name)}</b></div>${badge(x.confidence)}</article>`).join("")}</div>`:`<div class="intel-empty">No verified project companies yet. BuildScout should enrich this project before recommending outreach.</div>`}</section>
        <section class="intel-section"><div class="intel-title"><h3>Decision makers</h3><span>Contact data remains tied to source evidence</span></div>${contacts.length?`<div class="intel-list">${contacts.map(x=>`<article><div><small>${esc(x.title||"Contact")}</small><b>${esc(x.full_name)}</b><p>${esc([x.email,x.phone].filter(Boolean).join(" · "))}</p></div>${badge(x.confidence)}</article>`).join("")}</div>`:`<div class="intel-empty">No verified decision-maker contacts yet.</div>`}</section>
        <section class="intel-section"><div class="intel-title"><h3>Plans & specifications</h3><button class="btn secondary" onclick="BuildScoutProjectDocuments.open('${projectId}',${JSON.stringify(projectName||"Project")})">${docs.length?`Open ${docs.length} document${docs.length===1?"":"s"}`:"Open document center"}</button></div><div class="intel-empty">${docs.length?"Authorized/public project documents are available in the document center.":"No authorized/public plans are attached yet."}</div></section>
        <section class="intel-section"><div class="intel-title"><h3>Source evidence</h3><span>${sources.length} signal${sources.length===1?"":"s"}</span></div>${sources.length?`<div class="intel-list">${sources.map(x=>`<article><div><small>${esc(x.source_type.replaceAll("_"," "))}</small><b>${esc(x.source_name)}</b><p>${esc(x.source_record_id||"")}</p></div>${badge(x.confidence)}</article>`).join("")}</div>`:`<div class="intel-empty">No structured source evidence has been attached yet.</div>`}</section>`;
    }catch(error){console.error(error);document.getElementById("intelBody").innerHTML=`<div class="intel-empty">Project intelligence tables are not ready yet. Run the Phase 24 Supabase migration, then try again.</div>`;}
  }
  function close(){document.getElementById("buildScoutIntelligenceModal")?.remove();}
  window.BuildScoutIntelligence={open,close};
})();