(() => {
  const B=()=>window.BuildScoutBackend;
  const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  async function uid(){return (await B().getSession())?.user?.id||null}
  async function logAndAdvance(projectId,type,subject,nextAction,followDays=2){
    const user_id=await uid(); if(!user_id)return;
    await B().addActivity({user_id,project_id:projectId,activity_type:type,subject,body:subject});
    const pipes=await B().getPipeline(user_id); const p=(pipes||[]).find(x=>String(x.project_id)===String(projectId))||{};
    const follow=new Date(`${day(followDays)}T12:00:00`).toISOString();
    await B().updatePipeline(user_id,projectId,p.stage||'Contacted',p.notes||'',follow,{opportunity_value:Number(p.opportunity_value||0),probability:Number(p.probability||0),expected_close_date:p.expected_close_date||null,next_action:nextAction,lost_reason:p.lost_reason||null});
    await window.BuildScoutCRM?.open(projectId);
  }
  async function completeRecommended(projectId){
    const next=document.getElementById('crm-next')?.value?.trim()||'Follow up with project team';
    const detail=prompt('What happened? Add a quick outcome note:',next); if(!detail)return;
    await logAndAdvance(projectId,'call',detail,'Follow up on '+next,2);
  }
  async function scheduleFollowUp(projectId){
    const date=prompt('Follow-up date (YYYY-MM-DD):',day(2)); if(!date)return;
    const user_id=await uid(); const pipes=await B().getPipeline(user_id); const p=(pipes||[]).find(x=>String(x.project_id)===String(projectId))||{};
    await B().updatePipeline(user_id,projectId,p.stage||'New Opportunity',p.notes||'',new Date(`${date}T12:00:00`).toISOString(),{opportunity_value:Number(p.opportunity_value||0),probability:Number(p.probability||0),expected_close_date:p.expected_close_date||null,next_action:p.next_action||'Follow up',lost_reason:p.lost_reason||null});
    await B().addActivity({user_id,project_id:projectId,activity_type:'task',subject:`Follow up ${date}`,body:'Follow-up scheduled from BuildScout',due_at:new Date(`${date}T12:00:00`).toISOString()});
    await window.BuildScoutCRM?.open(projectId);
  }
  function mount(){
    const body=document.getElementById('crm-command-body'); if(!body||body.querySelector('[data-phase5-actions]'))return;
    const save=[...body.querySelectorAll('button')].find(b=>b.textContent.trim()==='Save opportunity'); if(!save)return;
    const modal=document.getElementById('crm-modal'); const title=modal?.querySelector('.crm-header h1')?.textContent?.trim();
    const project=(window.__buildScoutProjects||[]).find?.(p=>p.name===title);
    const openFn=window.BuildScoutCRM?.open; if(!openFn)return;
    const onclick=save.getAttribute('onclick')||''; const id=onclick.match(/saveOpportunity\('([^']+)'\)/)?.[1]; if(!id)return;
    const bar=document.createElement('div'); bar.dataset.phase5Actions='1'; bar.className='crm-quick-actions';
    bar.innerHTML=`<button class="btn primary" onclick="BuildScoutPhase5.completeRecommended('${id}')">✓ Complete next action</button><button class="btn secondary" onclick="BuildScoutPhase5.scheduleFollowUp('${id}')">Schedule follow-up</button>`;
    save.parentElement.appendChild(bar);
  }
  const observer=new MutationObserver(()=>setTimeout(mount,25)); observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('load',mount);
  window.BuildScoutPhase5={completeRecommended,scheduleFollowUp,logAndAdvance,mount};
})();