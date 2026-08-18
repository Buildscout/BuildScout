(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
  function cleanCompany(s){return String(s||'').replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}.*/,'').replace(/\s+\d{2,6}\s+.*$/,'').replace(/\s+,/g,',').trim();}
  function roleMatch(contacts,re){return (contacts||[]).some(c=>re.test(String(c.role||'')));}
  function build(project,pipeline,contacts,docs,activities){
    const value=Number(pipeline?.opportunity_value||project?.estimated_value||0);
    const probability=Number(pipeline?.probability||0);
    const hasGC=Boolean(project?.general_contractor);
    const hasEstimator=roleMatch(contacts,/estimat/i);
    const hasPM=roleMatch(contacts,/project manager|\bpm\b/i);
    const hasOwner=roleMatch(contacts,/owner|developer/i);
    const hasDecisionMaker=hasEstimator||hasPM||hasOwner;
    const hasContact=(contacts||[]).some(c=>c.phone||c.email);
    const hasPlans=(docs||[]).length>0;
    const hasNext=Boolean(pipeline?.next_action||pipeline?.follow_up_at);
    const touched=(activities||[]).length>0;
    let score=20;
    if(value>=100000)score+=8;if(value>=500000)score+=5;if(probability>=20)score+=8;if(probability>=50)score+=5;
    if(hasGC)score+=12;if(hasDecisionMaker)score+=15;if(hasContact)score+=8;if(hasPlans)score+=10;if(hasNext)score+=6;if(touched)score+=3;
    score=clamp(score);
    const blockers=[];
    if(!hasGC)blockers.push('General contractor is not identified');
    if(!hasDecisionMaker)blockers.push('Estimator / PM / owner is not identified');
    if(!hasContact)blockers.push('No direct phone or email is saved');
    if(!hasPlans)blockers.push('No plans or specifications are available');
    if(!hasNext)blockers.push('No next action or follow-up is scheduled');
    const next=!hasGC?'Identify the GC and confirm who is bidding the job':!hasDecisionMaker?'Call the GC and ask for the estimator or project manager':!hasContact?'Get direct phone/email for the top decision maker':!hasPlans?'Request the latest plans, specs and addenda':!hasNext?'Set the next sales action and follow-up date':'Contact the top decision maker and advance the opportunity';
    const level=score>=80?'READY TO PURSUE':score>=60?'NEARLY READY':score>=40?'NEEDS RESEARCH':'EARLY LEAD';
    return {score,level,value,hasGC,hasDecisionMaker,hasContact,hasPlans,hasNext,blockers,next};
  }
  function styles(){if(document.getElementById('phase10-css'))return;const s=document.createElement('style');s.id='phase10-css';s.textContent=`.phase10{border:1px solid #2d4657;border-radius:12px;padding:16px;background:linear-gradient(145deg,#10202c,#0d1922)}.phase10-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.phase10-kicker{font-size:11px;font-weight:900;letter-spacing:2px;color:#ff9f35}.phase10 h3{margin:3px 0 4px}.phase10-sub{color:#8fa2af;font-size:12px}.phase10-score{text-align:right;min-width:110px}.phase10-score b{display:block;font-size:30px;line-height:1}.phase10-score span{font-size:10px;font-weight:900;letter-spacing:1px;color:#9fb0bb}.phase10-bar{height:8px;border-radius:999px;background:#0a151e;border:1px solid #263d4c;margin:13px 0;overflow:hidden}.phase10-bar i{display:block;height:100%;background:#ff9f35}.phase10-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.phase10-check{background:#0a151e;border:1px solid #263d4c;border-radius:8px;padding:9px}.phase10-check small{display:block;color:#8398a6;font-size:9px;text-transform:uppercase;font-weight:900}.phase10-check b{display:block;margin-top:3px;font-size:11px}.phase10-check.yes b{color:#8ed7a5}.phase10-check.no b{color:#e6b078}.phase10-next{margin-top:11px;padding:11px 12px;border-radius:8px;background:#0b1720}.phase10-next small{display:block;color:#ff9f35;font-size:9px;font-weight:900;letter-spacing:1px}.phase10-next b{display:block;margin-top:3px}.phase10-blockers{margin-top:8px;color:#8fa2af;font-size:11px}@media(max-width:850px){.phase10-grid{grid-template-columns:1fr 1fr}.phase10-head{flex-direction:column}.phase10-score{text-align:left}}`;document.head.appendChild(s);}
  async function mount(projectId){
    const box=document.querySelector('#crm-modal .crm-command');if(!box||!projectId||box.dataset.phase10Mounted==='1'||box.dataset.phase10Mounting==='1')return;
    box.dataset.phase10Mounting='1';try{
      const B=window.BuildScoutBackend;if(!B)return;const session=await B.getSession(),uid=session?.user?.id;if(!uid)return;
      const [projects,pipes,contacts,docs,activities]=await Promise.all([B.getProjects(),B.getPipeline(uid),B.getContacts(uid,projectId),B.getProjectDocuments(projectId).catch(()=>[]),B.getActivities(uid,projectId)]);
      if(!document.body.contains(box))return;const project=(projects||[]).find(p=>String(p.id)===String(projectId));if(!project)return;const pipeline=(pipes||[]).find(p=>String(p.project_id)===String(projectId))||{};const r=build(project,pipeline,contacts,docs,activities);styles();
      const section=document.createElement('section');section.className='crm-wide phase10';section.dataset.phase10='1';
      const checks=[['GC identified',r.hasGC],['Decision maker',r.hasDecisionMaker],['Direct contact',r.hasContact],['Plans / specs',r.hasPlans],['Next action',r.hasNext]];
      section.innerHTML=`<div class="phase10-head"><div><div class="phase10-kicker">PURSUIT READINESS</div><h3>Is this opportunity ready to work?</h3><div class="phase10-sub">BuildScout checks the information a salesperson needs before spending time on the deal.</div></div><div class="phase10-score"><b>${r.score}/100</b><span>${esc(r.level)}</span></div></div><div class="phase10-bar"><i style="width:${r.score}%"></i></div><div class="phase10-grid">${checks.map(([label,ok])=>`<div class="phase10-check ${ok?'yes':'no'}"><small>${esc(label)}</small><b>${ok?'✓ Ready':'Needs work'}</b></div>`).join('')}</div><div class="phase10-next"><small>NEXT BEST MOVE</small><b>${esc(r.next)}</b></div><div class="phase10-blockers">${r.blockers.length?`Missing: ${esc(r.blockers.join(' • '))}`:`Sales package is complete. Opportunity ${money(r.value)} is ready for active pursuit.`}</div>`;
      const grid=box.querySelector('.crm-grid');if(!grid)return;const phase9=grid.querySelector('[data-phase9]');if(phase9)phase9.insertAdjacentElement('afterend',section);else grid.prepend(section);box.dataset.phase10Mounted='1';
    }catch(e){console.warn('Phase 10 mount skipped:',e);}finally{delete box.dataset.phase10Mounting;}
  }
  function hook(){if(!window.BuildScoutCRM?.open||window.BuildScoutCRM.open.__phase10Hooked)return false;const original=window.BuildScoutCRM.open;async function openWithPhase10(projectId){const result=await original(projectId);setTimeout(()=>mount(projectId),180);return result;}openWithPhase10.__phase10Hooked=true;window.BuildScoutCRM.open=openWithPhase10;return true;}
  if(!hook()){let tries=0;const timer=setInterval(()=>{tries++;if(hook()||tries>40)clearInterval(timer);},100);}
  window.BuildScoutPhase10={mount};
})();
