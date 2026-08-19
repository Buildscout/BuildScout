(() => {
  if (window.__buildScoutPhase15Loaded) return;
  window.__buildScoutPhase15Loaded = true;

  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { project:null, projectId:null, candidates:[] };
  const phoneDigits = v => String(v||'').replace(/\D/g,'');
  const companyFrom = text => String(text||'').replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}.*/,'').replace(/\s+\d{2,6}\s+.*$/,'').trim();

  function currentProjectId(){
    const modal=document.querySelector('#crm-modal')||document;
    const btn=modal.querySelector('[onclick*="saveOpportunity"]');
    const fromSave=(btn?.getAttribute('onclick')||'').match(/saveOpportunity\(['"]([^'"]+)['"]\)/)?.[1];
    if(fromSave) return fromSave;
    const any=[...modal.querySelectorAll('[onclick]')].map(x=>x.getAttribute('onclick')||'').join('\n');
    return any.match(/(?:openDecisionMakerResearch|openCRM|saveOpportunity)\(['"]([^'"]+)['"]\)/)?.[1]||null;
  }
  function projectCompany(p){ return companyFrom(p?.general_contractor)||p?.general_contractor||''; }
  function locationText(p){ return [p?.address,p?.city,p?.state].filter(Boolean).join(', '); }
  function querySet(p){
    const co=projectCompany(p), loc=locationText(p), name=p?.name||'';
    return [
      {label:'Estimator', q:`"${co}" estimator ${loc}`},
      {label:'Project manager', q:`"${co}" "project manager" ${loc}`},
      {label:'Preconstruction', q:`"${co}" preconstruction ${loc}`},
      {label:'Purchasing', q:`"${co}" purchasing procurement ${loc}`},
      {label:'Project-specific', q:`"${co}" "${name}"`},
      {label:'LinkedIn people', q:`site:linkedin.com/in "${co}" estimator OR "project manager" OR preconstruction`}
    ];
  }
  function google(q){ return `https://www.google.com/search?q=${encodeURIComponent(q)}`; }
  function confidence(c){ let s=0;if(c.first||c.last)s+=25;if(c.company)s+=10;if(c.role)s+=15;if(c.email)s+=20;if(phoneDigits(c.phone).length>=10)s+=20;if(c.source)s+=10;return Math.min(100,s); }
  function styles(){
    if(document.getElementById('bs15-css')) return;
    const s=document.createElement('style'); s.id='bs15-css'; s.textContent=`#bs15{position:fixed;inset:0;z-index:120000;background:rgba(2,10,16,.84);display:flex;align-items:center;justify-content:center;padding:20px;color:#edf4f8}.bs15-shell{width:min(1180px,97vw);max-height:94vh;overflow:auto;background:#0d1e29;border:1px solid #35576b;border-radius:20px;padding:26px;box-shadow:0 28px 90px #0009}.bs15-head{display:flex;justify-content:space-between;gap:18px}.bs15-k{color:#ff9f35;font-weight:900;letter-spacing:.18em;font-size:12px}.bs15-head h2{font-size:34px;margin:6px 0}.bs15-muted{color:#9eb0bc}.bs15-x{width:46px;height:46px;border:0;border-radius:12px;background:#1d3646;color:#fff;font-size:25px;cursor:pointer}.bs15-context{margin:20px 0;padding:16px 18px;border-radius:13px;background:#081721}.bs15-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bs15-panel{border:1px solid #2f4e61;border-radius:14px;padding:18px;background:#0a1923}.bs15-panel h3{margin:0 0 5px}.bs15-searches{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.bs15-search{display:block;text-decoration:none;border:1px solid #3b6075;background:#153042;color:#eaf2f6;border-radius:10px;padding:11px 12px;font-weight:800}.bs15-search span{display:block;color:#8fa7b5;font-size:11px;font-weight:500;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bs15-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bs15-form label{font-size:11px;font-weight:900;letter-spacing:.08em;color:#9eb0bc}.bs15-form input,.bs15-form select{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border-radius:9px;border:1px solid #35576b;background:#06151e;color:#fff}.bs15-wide{grid-column:1/-1}.bs15-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}.bs15-btn{border:1px solid #41677c;background:#193546;color:#fff;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer}.bs15-btn.primary{background:#ff9f35;border-color:#ff9f35;color:#08131a}.bs15-list{margin-top:18px}.bs15-candidate{display:grid;grid-template-columns:1fr auto;gap:12px;padding:14px;border:1px solid #2f4e61;border-radius:12px;margin-top:9px;background:#081721}.bs15-score{color:#ff9f35;font-weight:900}.bs15-candidate small{color:#91a6b3}.bs15-status{min-height:20px;margin-top:12px;color:#9eb0bc}.bs15-tip{margin-top:14px;border-left:3px solid #ff9f35;padding:10px 12px;background:#081721;color:#aebdc6}@media(max-width:800px){.bs15-grid,.bs15-form,.bs15-searches{grid-template-columns:1fr}.bs15-wide{grid-column:auto}}`; document.head.appendChild(s);
  }
  function formCandidate(root){const v=id=>root.querySelector(id)?.value?.trim()||'';return {first:v('#bs15-first'),last:v('#bs15-last'),company:v('#bs15-company'),role:v('#bs15-role'),email:v('#bs15-email'),phone:v('#bs15-phone'),source:v('#bs15-source'),notes:v('#bs15-notes')};}
  function renderCandidates(root){const list=root.querySelector('#bs15-list');if(!state.candidates.length){list.innerHTML='<div class="bs15-muted">No candidates captured yet. Search the public web, then add the best match here.</div>';return;}list.innerHTML=state.candidates.map((c,i)=>`<div class="bs15-candidate"><div><b>${esc([c.first,c.last].filter(Boolean).join(' ')||'Unnamed candidate')}</b> <span class="bs15-score">${confidence(c)}/100</span><br><span>${esc(c.role||'Role unknown')} • ${esc(c.company||'Company unknown')}</span><br><small>${esc(c.email||c.phone||'No direct contact yet')}${c.source?` • Source: ${esc(c.source)}`:''}</small></div><div><button class="bs15-btn primary" data-use="${i}">Use contact</button></div></div>`).join('');list.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>useCandidate(state.candidates[Number(b.dataset.use)]));}
  function useCandidate(c){document.getElementById('bs15')?.remove();const enrich=[...document.querySelectorAll('button')].find(b=>/Enrich contact/i.test(b.textContent||''));enrich?.click();setTimeout(()=>{const map={'#bs14-first':c.first,'#bs14-last':c.last,'#bs14-company':c.company,'#bs14-role':c.role,'#bs14-email':c.email,'#bs14-phone':c.phone,'#bs14-notes':[c.notes,c.source&&`Source: ${c.source}`].filter(Boolean).join('\n')};Object.entries(map).forEach(([sel,val])=>{const el=document.querySelector(sel);if(el&&val){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});},120);}
  async function open(){
    styles();const id=currentProjectId();if(!id){console.warn('BuildScout Phase 15: project id not found');return;}const B=window.BuildScoutBackend;if(!B?.getProjects){console.warn('BuildScout Phase 15: backend unavailable');return;}const p=(await B.getProjects()).find(x=>String(x.id)===String(id));if(!p)return;state.project=p;state.projectId=id;state.candidates=[];document.getElementById('bs15')?.remove();const co=projectCompany(p),searches=querySet(p);
    const wrap=document.createElement('div');wrap.id='bs15';wrap.innerHTML=`<div class="bs15-shell"><div class="bs15-head"><div><div class="bs15-k">CONTACT RESEARCH ENGINE</div><h2>Find the person behind the project</h2><div class="bs15-muted">Public-web research first. Paid enrichment providers stay optional.</div></div><button class="bs15-x">×</button></div><div class="bs15-context"><b>${esc(p.name||'Project')}</b><br><span class="bs15-muted">Target: ${esc(co||'Company not identified')} • ${esc(locationText(p)||'Location unavailable')}</span></div><div class="bs15-grid"><section class="bs15-panel"><h3>1. Run targeted research</h3><div class="bs15-muted">These searches are generated from this project's GC, location and project name.</div><div class="bs15-searches">${searches.map(x=>`<a class="bs15-search" href="${esc(google(x.q))}" target="_blank" rel="noopener">${esc(x.label)}<span>${esc(x.q)}</span></a>`).join('')}</div><div class="bs15-tip">Look for a person tied to estimating, project management, preconstruction, purchasing or ownership. Prefer evidence that connects them to this company and market.</div></section><section class="bs15-panel"><h3>2. Capture a candidate</h3><div class="bs15-form"><label>FIRST NAME<input id="bs15-first"></label><label>LAST NAME<input id="bs15-last"></label><label>COMPANY<input id="bs15-company" value="${esc(co)}"></label><label>ROLE<select id="bs15-role"><option>Estimator</option><option>Project Manager</option><option>Preconstruction Manager</option><option>Purchasing / Procurement</option><option>Developer / Owner</option><option>General Contractor</option><option>Other</option></select></label><label>DIRECT EMAIL<input id="bs15-email" type="email"></label><label>DIRECT PHONE<input id="bs15-phone" type="tel"></label><label class="bs15-wide">SOURCE / URL<input id="bs15-source" placeholder="Company page, LinkedIn, directory, permit record..."></label><label class="bs15-wide">NOTES<input id="bs15-notes" placeholder="Why this person looks relevant"></label></div><div class="bs15-actions"><button class="bs15-btn" id="bs15-add">Add candidate</button><button class="bs15-btn" id="bs15-copy">Copy research brief</button></div><div class="bs15-status" id="bs15-status"></div></section></div><section class="bs15-panel bs15-list"><h3>3. Choose the best candidate</h3><div id="bs15-list"></div></section></div>`;document.body.appendChild(wrap);renderCandidates(wrap);wrap.querySelector('.bs15-x').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};wrap.querySelector('#bs15-add').onclick=()=>{const c=formCandidate(wrap),status=wrap.querySelector('#bs15-status');if(!(c.first||c.last)){status.textContent='Add the candidate’s name first.';return;}if(!c.source&&!c.email&&!c.phone){status.textContent='Add a source, email or phone so BuildScout has evidence for this candidate.';return;}state.candidates.push(c);status.textContent=`Candidate added • confidence ${confidence(c)}/100`;['#bs15-first','#bs15-last','#bs15-email','#bs15-phone','#bs15-source','#bs15-notes'].forEach(s=>{const el=wrap.querySelector(s);if(el)el.value='';});renderCandidates(wrap);};wrap.querySelector('#bs15-copy').onclick=async()=>{const brief=`Research ${co||'the general contractor'} for ${p.name||'this project'} in ${locationText(p)||'this market'}. Find the estimator, project manager, preconstruction manager, purchasing contact, or owner tied to the work. Verify the person's current role and capture a source plus direct email or phone when publicly available.`;try{await navigator.clipboard.writeText(brief);wrap.querySelector('#bs15-status').textContent='Research brief copied.';}catch{wrap.querySelector('#bs15-status').textContent='Could not copy automatically.';}};
  }

  // Phase 12 renders Research contact as plain clickable text in some CRM cards,
  // not necessarily a button or anchor. Delegate from document in capture phase so
  // Phase 15 wins before the older handler can open its modal.
  document.addEventListener('click',e=>{
    if(e.target.closest('#bs15')) return;
    const target=e.target.closest('button,a,[role="button"],[onclick]')||e.target;
    const text=(target.textContent||'').trim();
    if(!/^Research contact$/i.test(text)) return;
    const crm=target.closest('#crm-modal')||document.querySelector('#crm-modal');
    if(!crm) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    open().catch(console.error);
  },true);

  // Mark controls for diagnostics only; click handling is delegated above so it
  // survives CRM re-renders without attaching duplicate listeners.
  function mark(){[...document.querySelectorAll('#crm-modal button,#crm-modal a,#crm-modal [role="button"],#crm-modal [onclick],#crm-modal div,#crm-modal span')].forEach(el=>{if(/^Research contact$/i.test((el.textContent||'').trim()))el.dataset.bs15Research='1';});}
  const obs=new MutationObserver(()=>requestAnimationFrame(mark));obs.observe(document.body,{childList:true,subtree:true});mark();
  window.BuildScoutPhase15={open};
})();