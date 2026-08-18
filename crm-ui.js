(() => {
  const B = () => window.BuildScoutBackend;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const stages=['New Opportunity','Researching','Contacted','Qualified','Bidding','Quote Sent','Negotiation','Won','Lost'];
  const project = id => (window.projects||[]).find(p=>String(p.id)===String(id));
  const uid = () => window.currentSession?.user?.id || null;

  function field(label,id,type='text',placeholder='') { return `<label class="crm-field"><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}"></label>`; }
  function selectField(label,id,options){return `<label class="crm-field"><span>${label}</span><select id="${id}">${options.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`;}

  async function open(projectId){
    const p=project(projectId); const userId=uid(); if(!p||!userId) return;
    document.getElementById('crm-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="crm-modal"><div class="modalbox crm-command"><button class="close" onclick="document.getElementById('crm-modal').remove()">×</button><div class="crm-kicker">SALES COMMAND CENTER</div><h1>${esc(p.name||'Construction opportunity')}</h1><div class="muted">${esc([p.street_address,p.city,p.zip_code].filter(Boolean).join(', '))}</div><div id="crm-command-body" class="crm-loading">Loading CRM intelligence…</div></div></div>`);
    try{
      const [contacts,activities,pipes]=await Promise.all([B().getContacts(userId,projectId),B().getActivities(userId,projectId),B().getPipeline(userId)]);
      render(projectId,contacts,activities,(pipes||[]).find(x=>String(x.project_id)===String(projectId))||{});
    }catch(e){document.getElementById('crm-command-body').innerHTML=`<div class="panel">CRM could not load: ${esc(e.message)}</div>`;}
  }

  function render(projectId,contacts,activities,pipe){
    const body=document.getElementById('crm-command-body'); if(!body)return;
    const p=project(projectId)||{};
    body.innerHTML=`
      <div class="crm-metrics">
        <div class="stat"><small>Opportunity value</small><b>${money(pipe.opportunity_value||p.value)}</b></div>
        <div class="stat"><small>Win probability</small><b>${Number(pipe.probability||0)}%</b></div>
        <div class="stat"><small>Sales stage</small><b>${esc(pipe.stage||'New Opportunity')}</b></div>
        <div class="stat"><small>Next action</small><b>${esc(pipe.next_action||'Set next step')}</b></div>
      </div>
      <div class="crm-grid">
        <section class="panel"><div class="crm-section-head"><h3>Opportunity</h3><span>Turn project intelligence into revenue</span></div>
          <div class="crm-form-grid">${selectField('Stage','crm-stage',stages)}${field('Opportunity value','crm-value','number')}${field('Probability %','crm-prob','number')}${field('Expected close','crm-close','date')}${field('Next action','crm-next','text','Call GC, price plans, follow up…')}${field('Follow-up','crm-follow','datetime-local')}</div>
          <label class="crm-field"><span>Sales notes</span><textarea id="crm-notes" placeholder="Scope, competitors, bid strategy, decision makers…">${esc(pipe.notes||'')}</textarea></label>
          <button class="btn primary" onclick="BuildScoutCRM.saveOpportunity('${projectId}')">Save opportunity</button>
        </section>
        <section class="panel"><div class="crm-section-head"><h3>Project contacts</h3><span>${contacts.length} relationship${contacts.length===1?'':'s'}</span></div>
          <div class="crm-contact-list">${contacts.map(c=>`<div class="crm-contact"><div><b>${esc(c.name||c.company||'Contact')}</b><div class="muted">${esc([c.role,c.company].filter(Boolean).join(' • '))}</div><div>${esc(c.email||'')} ${c.phone?` • ${esc(c.phone)}`:''}</div></div>${c.is_primary?'<span class="tag">PRIMARY</span>':''}</div>`).join('')||'<div class="muted">No contacts yet. Add the GC, owner, estimator, architect, or decision maker.</div>'}</div>
          <div class="crm-form-grid">${field('Name','crm-cname')}${field('Company','crm-company')}${field('Role','crm-role','text','GC / Estimator / Owner')}${field('Email','crm-email','email')}${field('Phone','crm-phone','tel')}</div><button class="btn secondary" onclick="BuildScoutCRM.addContact('${projectId}')">+ Add contact</button>
        </section>
        <section class="panel crm-wide"><div class="crm-section-head"><h3>Activity timeline</h3><span>Every touchpoint in one place</span></div>
          <div class="crm-quick-actions"><button onclick="BuildScoutCRM.log('${projectId}','call')">Log call</button><button onclick="BuildScoutCRM.log('${projectId}','email')">Log email</button><button onclick="BuildScoutCRM.log('${projectId}','meeting')">Log meeting</button><button onclick="BuildScoutCRM.log('${projectId}','note')">Add note</button><button onclick="BuildScoutCRM.log('${projectId}','task')">Add task</button></div>
          <div class="crm-timeline">${activities.map(a=>`<div class="crm-activity"><div class="crm-dot"></div><div><b>${esc((a.activity_type||'activity').toUpperCase())}</b><div>${esc(a.subject||a.body||a.notes||'CRM activity')}</div><small>${a.created_at?new Date(a.created_at).toLocaleString():''}</small></div></div>`).join('')||'<div class="muted">No activity yet. Your first outreach will appear here.</div>'}</div>
        </section>
      </div>`;
    const vals={'crm-stage':pipe.stage||'New Opportunity','crm-value':pipe.opportunity_value||p.value||'','crm-prob':pipe.probability||'','crm-close':pipe.expected_close_date||'','crm-next':pipe.next_action||''}; Object.entries(vals).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v;});
  }

  async function saveOpportunity(projectId){
    const val=id=>document.getElementById(id)?.value; await B().updatePipeline(uid(),projectId,val('crm-stage'),val('crm-notes'),val('crm-follow'),{opportunity_value:Number(val('crm-value')||0),probability:Number(val('crm-prob')||0),expected_close_date:val('crm-close')||null,next_action:val('crm-next')||null}); await open(projectId);
  }
  async function addContact(projectId){const val=id=>document.getElementById(id)?.value?.trim();if(!val('crm-cname')&&!val('crm-company'))return;await B().saveContact(uid(),projectId,{name:val('crm-cname'),company:val('crm-company'),role:val('crm-role'),email:val('crm-email'),phone:val('crm-phone')});await open(projectId);}
  async function log(projectId,type){const text=prompt(`${type[0].toUpperCase()+type.slice(1)} details:`);if(!text)return;await B().addActivity(uid(),projectId,{activity_type:type,subject:text});await open(projectId);}

  function mountButtons(){document.querySelectorAll('.modalbox').forEach(box=>{if(box.closest('#crm-modal')||box.querySelector('[data-crm-launch]'))return;const buttons=box.querySelectorAll('.btn');if(!buttons.length)return;const text=box.textContent||'';const p=(window.projects||[]).find(x=>text.includes(x.name));if(!p)return;const row=buttons[buttons.length-1].parentElement;if(!row)return;const b=document.createElement('button');b.className='btn primary';b.dataset.crmLaunch='1';b.textContent='Sales CRM';b.onclick=()=>open(p.id);row.appendChild(b);});}
  new MutationObserver(()=>mountButtons()).observe(document.documentElement,{childList:true,subtree:true});
  window.BuildScoutCRM={open,saveOpportunity,addContact,log};
})();