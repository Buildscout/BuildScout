(() => {
  const B=()=>window.BuildScoutBackend;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const openStages=new Set(['New Opportunity','Researching','Contacted','Qualified','Bidding','Quote Sent','Negotiation']);
  let rendering=false;

  function dayStart(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);return x;}
  function isToday(v){if(!v)return false;const d=new Date(v),t=dayStart();return d>=t&&d<new Date(t.getTime()+86400000);}
  function isOverdue(v){return Boolean(v)&&new Date(v)<dayStart();}
  function daysSince(v){if(!v)return 999;return Math.max(0,Math.floor((Date.now()-new Date(v).getTime())/86400000));}
  function priority(p,pipe,activity=[]){let n=Number(p.opportunity_score||0);const value=Number(pipe.opportunity_value||p.estimated_value||0);if(value>=1000000)n+=8;else if(value>=500000)n+=5;if(p.general_contractor)n+=6;if(pipe.next_action)n+=5;if(pipe.follow_up_at&&isOverdue(pipe.follow_up_at))n+=12;if(pipe.follow_up_at&&isToday(pipe.follow_up_at))n+=8;if(activity.length===0)n+=6;const last=activity[0]?.created_at;if(last&&daysSince(last)>14)n+=5;return Math.min(100,n);}
  function reason(p,pipe,activity){const reasons=[];if(pipe.follow_up_at&&isOverdue(pipe.follow_up_at))reasons.push('Overdue follow-up');else if(pipe.follow_up_at&&isToday(pipe.follow_up_at))reasons.push('Follow-up due today');if(!activity.length)reasons.push('No outreach logged');if(Number(p.opportunity_score||0)>=75)reasons.push('High project score');if(Number(pipe.opportunity_value||p.estimated_value||0)>=1000000)reasons.push('$1M+ opportunity');if(p.general_contractor)reasons.push('GC identified');return reasons.slice(0,3).join(' • ')||'Advance this opportunity';}
  function action(pipe,p){if(pipe.next_action)return pipe.next_action;if(pipe.follow_up_at&&isOverdue(pipe.follow_up_at))return 'Complete overdue follow-up';if(p.general_contractor)return 'Call GC';return 'Research decision maker';}

  async function load(){
    const session=await B().getSession();const uid=session?.user?.id;if(!uid)return null;
    const [projects,pipeline]=await Promise.all([B().getProjects(),B().getPipeline(uid)]);
    const byId=Object.fromEntries((projects||[]).map(p=>[String(p.id),p]));
    const open=(pipeline||[]).filter(x=>openStages.has(x.stage)&&byId[String(x.project_id)]);
    const activityPairs=await Promise.all(open.map(async x=>[String(x.project_id),await B().getActivities(uid,x.project_id)]));
    const activities=Object.fromEntries(activityPairs);
    const rows=open.map(pipe=>{const p=byId[String(pipe.project_id)],a=activities[String(pipe.project_id)]||[];return{p,pipe,a,priority:priority(p,pipe,a)}}).sort((a,b)=>b.priority-a.priority);
    return{rows,projects,pipeline};
  }

  function card(row,rank){const {p,pipe,a,priority}=row;const next=action(pipe,p);return `<div class="today-lead"><div class="today-rank">#${rank}</div><div class="today-lead-main"><div class="today-lead-top"><div><b>${esc(p.name||'Unnamed project')}</b><div class="muted">${esc(p.city||'')} • ${money(pipe.opportunity_value||p.estimated_value)}</div></div><div class="today-priority">${priority}/100</div></div><div class="today-reason">${esc(reason(p,pipe,a))}</div><div class="today-next"><span>Next:</span> ${esc(next)}</div></div><div class="today-actions"><button class="btn primary" onclick="BuildScoutCRM.open('${p.id}')">Work lead</button><button class="btn secondary" onclick="viewProject('${p.id}')">Project</button></div></div>`;}

  async function mount(){
    if(rendering)return;const main=document.getElementById('main');if(!main)return;
    const h1=main.querySelector('.pagehead h1');if(!h1||h1.textContent.trim()!=='Construction Intelligence')return;
    if(main.querySelector('#today-command-center'))return;
    rendering=true;
    try{
      const data=await load();if(!data)return;const {rows}=data;
      const overdue=rows.filter(r=>isOverdue(r.pipe.follow_up_at));
      const dueToday=rows.filter(r=>isToday(r.pipe.follow_up_at));
      const untouched=rows.filter(r=>r.a.length===0&&r.priority>=65);
      const hot=rows.filter(r=>r.priority>=75);
      const weighted=rows.reduce((s,r)=>s+(Number(r.pipe.opportunity_value||r.p.estimated_value||0)*Number(r.pipe.probability||0)/100),0);
      const top=rows.slice(0,10);
      const wrap=document.createElement('section');wrap.id='today-command-center';wrap.className='today-command-center';wrap.innerHTML=`<div class="today-head"><div><div class="today-kicker">TODAY</div><h2>Your sales command center</h2><div class="muted">The construction opportunities that deserve attention right now.</div></div><button class="btn secondary" onclick="go('pipeline')">Open full pipeline</button></div><div class="today-stats"><div class="today-stat dangerish"><small>Overdue follow-ups</small><b>${overdue.length}</b></div><div class="today-stat"><small>Due today</small><b>${dueToday.length}</b></div><div class="today-stat"><small>Untouched priority leads</small><b>${untouched.length}</b></div><div class="today-stat"><small>Priority opportunities</small><b>${hot.length}</b></div><div class="today-stat"><small>Weighted pipeline</small><b>${money(weighted)}</b></div></div><div class="today-grid"><div class="panel today-top"><div class="today-section-head"><div><h3>Top 10 to work today</h3><div class="muted">Ranked by opportunity score, value, timing, follow-up urgency and activity.</div></div></div>${top.map((r,i)=>card(r,i+1)).join('')||'<div class="muted">Add projects to your pipeline and they will appear here.</div>'}</div><div class="today-side"><div class="panel"><h3>Needs attention</h3><div class="today-mini"><b>${overdue.length}</b><span>overdue follow-ups</span></div><div class="today-mini"><b>${untouched.length}</b><span>priority leads with no outreach</span></div><div class="today-mini"><b>${dueToday.length}</b><span>follow-ups due today</span></div></div><div class="panel"><h3>Fastest wins</h3>${rows.filter(r=>r.p.general_contractor&&r.priority>=65).slice(0,4).map(r=>`<button class="today-fast" onclick="BuildScoutCRM.open('${r.p.id}')"><span>${esc(r.p.name||'Project')}</span><small>GC identified • ${r.priority}/100</small></button>`).join('')||'<div class="muted">No contact-ready opportunities yet.</div>'}</div></div></div>`;
      const pagehead=main.querySelector('.pagehead');pagehead.insertAdjacentElement('afterend',wrap);
    }catch(e){console.error('Today dashboard failed:',e);}finally{rendering=false;}
  }

  let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(mount,120);}new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',schedule);window.BuildScoutToday={mount};
})();