(() => {
  const B=()=>window.BuildScoutBackend;
  const openStages=new Set(['New Opportunity','Researching','Contacted','Qualified','Bidding','Quote Sent','Negotiation']);
  const stageProbability={'New Opportunity':10,'Researching':15,'Contacted':25,'Qualified':40,'Bidding':55,'Quote Sent':70,'Negotiation':85};
  const dayStart=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
  const daysSince=v=>v?Math.max(0,Math.floor((Date.now()-new Date(v).getTime())/86400000)):999;
  const overdue=v=>Boolean(v)&&new Date(v)<dayStart();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function suggestedProbability(p,pipe,activities=[]){
    let n=stageProbability[pipe.stage]??10;
    const score=Number(p.opportunity_score||0);
    if(score>=85)n+=10;else if(score>=70)n+=5;
    if(p.general_contractor)n+=5;
    if(Number(pipe.opportunity_value||p.estimated_value||0)>=1000000)n+=5;
    if(activities.length)n+=5;
    if(activities.some(a=>['call','email','meeting'].includes(String(a.activity_type||a.type||'').toLowerCase())))n+=5;
    if(overdue(pipe.follow_up_at))n-=5;
    return Math.max(5,Math.min(95,n));
  }

  function staleDays(pipe,activities=[]){const latest=activities[0]?.created_at||pipe.updated_at||pipe.created_at;return daysSince(latest);}
  function nextMove(p,pipe,activities=[]){
    if(overdue(pipe.follow_up_at))return 'Complete overdue follow-up';
    if(!activities.length&&p.general_contractor)return 'Call GC and confirm estimator / bid timing';
    if(!activities.length)return 'Research owner, GC and decision maker';
    if(pipe.stage==='New Opportunity'||pipe.stage==='Researching')return 'Qualify scope, bid date and decision maker';
    if(pipe.stage==='Contacted')return 'Request plans and confirm pricing opportunity';
    if(pipe.stage==='Qualified')return 'Schedule estimating follow-up';
    if(pipe.stage==='Bidding')return 'Confirm bid date and submit pricing';
    if(pipe.stage==='Quote Sent')return 'Follow up on quote and objections';
    if(pipe.stage==='Negotiation')return 'Confirm final decision and close plan';
    return pipe.next_action||'Advance opportunity';
  }

  function changeSignals(p,pipe,activities=[]){
    const out=[];
    if(p.last_verified&&daysSince(p.last_verified)<=1)out.push('Project data refreshed');
    if(activities[0]&&daysSince(activities[0].created_at)<=1)out.push('New CRM activity');
    if(pipe.updated_at&&daysSince(pipe.updated_at)<=1)out.push('Opportunity updated');
    return out;
  }

  async function load(){
    const session=await B().getSession(),uid=session?.user?.id;if(!uid)return null;
    const [projects,pipeline]=await Promise.all([B().getProjects(),B().getPipeline(uid)]);
    const byId=Object.fromEntries((projects||[]).map(p=>[String(p.id),p]));
    const open=(pipeline||[]).filter(x=>openStages.has(x.stage)&&byId[String(x.project_id)]);
    const pairs=await Promise.all(open.map(async pipe=>[String(pipe.project_id),await B().getActivities(uid,pipe.project_id)]));
    const acts=Object.fromEntries(pairs);
    return open.map(pipe=>{const p=byId[String(pipe.project_id)],a=acts[String(pipe.project_id)]||[];return{p,pipe,a,suggested:suggestedProbability(p,pipe,a),stale:staleDays(pipe,a),move:nextMove(p,pipe,a),changes:changeSignals(p,pipe,a)};});
  }

  function row(r){
    const current=Number(r.pipe.probability||0),delta=r.suggested-current;
    return `<div class="phase4-row"><div><b>${esc(r.p.name||'Project')}</b><div class="muted">${esc(r.pipe.stage)} • ${r.stale>=999?'No activity':r.stale+'d since touch'}</div></div><div><small>Suggested probability</small><b>${r.suggested}%</b>${delta?`<span class="phase4-delta">${delta>0?'+':''}${delta} pts</span>`:''}</div><div><small>Next best action</small><b>${esc(r.move)}</b></div><button class="btn secondary" onclick="BuildScoutCRM.open('${r.p.id}')">Work lead</button></div>`;
  }

  async function mount(){
    const main=document.getElementById('main');if(!main||main.querySelector('#phase4-intelligence'))return;
    const h1=main.querySelector('.pagehead h1');if(!h1||h1.textContent.trim()!=='Construction Intelligence')return;
    try{
      const rows=await load();if(!rows)return;
      const stale=rows.filter(r=>r.stale>=14).sort((a,b)=>b.stale-a.stale);
      const changed=rows.filter(r=>r.changes.length).sort((a,b)=>b.changes.length-a.changes.length);
      const recommended=rows.sort((a,b)=>(b.suggested-Number(b.pipe.probability||0))-(a.suggested-Number(a.pipe.probability||0))).slice(0,5);
      const section=document.createElement('section');section.id='phase4-intelligence';section.className='panel phase4-intelligence';
      section.innerHTML=`<div class="today-section-head"><div><div class="today-kicker">SMART SALES</div><h3>Sales intelligence</h3><div class="muted">BuildScout recommends probability, next actions and opportunities that need a fresh touch.</div></div></div><div class="phase4-stats"><div><small>Stale 14+ days</small><b>${stale.length}</b></div><div><small>Changed recently</small><b>${changed.length}</b></div><div><small>Probability recommendations</small><b>${rows.filter(r=>r.suggested!==Number(r.pipe.probability||0)).length}</b></div></div><div class="phase4-list">${recommended.map(row).join('')||'<div class="muted">No open opportunities yet.</div>'}</div>${changed.length?`<div class="phase4-changes"><h4>What changed?</h4>${changed.slice(0,5).map(r=>`<button class="today-fast" onclick="BuildScoutCRM.open('${r.p.id}')"><span>${esc(r.p.name)}</span><small>${esc(r.changes.join(' • '))}</small></button>`).join('')}</div>`:''}`;
      const today=main.querySelector('#today-command-center');if(today)today.insertAdjacentElement('afterend',section);else main.querySelector('.pagehead').insertAdjacentElement('afterend',section);
    }catch(e){console.error('Phase 4 sales intelligence failed:',e);}
  }
  let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(mount,180);};new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',schedule);window.BuildScoutPhase4={mount,suggestedProbability,nextMove};
})();