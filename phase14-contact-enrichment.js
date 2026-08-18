(() => {
  if (window.__buildScoutPhase14Loaded) return;
  window.__buildScoutPhase14Loaded = true;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phone = v => String(v || '').replace(/\D/g,'');
  const projectTitle = () => document.querySelector('h1')?.textContent?.trim() || 'this project';
  const company = () => {
    const text = document.body.innerText;
    const m = text.match(/Known GC:\s*([^•\n]+)/i) || text.match(/General Contractor\s*\n([^\n]+)/i);
    return m ? m[1].trim() : '';
  };

  function findContactArea(){
    return [...document.querySelectorAll('h1,h2,h3')].find(x => /Project contacts/i.test(x.textContent || ''))?.parentElement;
  }

  function existingContacts(){
    const area = findContactArea();
    if (!area) return [];
    return [...area.querySelectorAll('div')].map(el => el.innerText?.trim()).filter(t => t && /@|\d{7,}/.test(t)).slice(0,20);
  }

  function openEnrichment(){
    document.getElementById('bs14-enrichment-modal')?.remove();
    const gc = company();
    const title = projectTitle();
    const wrap = document.createElement('div');
    wrap.id = 'bs14-enrichment-modal';
    wrap.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(3,12,20,.82);display:flex;align-items:center;justify-content:center;padding:24px;';
    wrap.innerHTML = `<div style="width:min(1040px,96vw);max-height:92vh;overflow:auto;background:#0e202c;border:1px solid #35566a;border-radius:20px;padding:28px;color:#e9f1f6;box-shadow:0 24px 80px rgba(0,0,0,.5)">
      <div style="display:flex;justify-content:space-between;gap:20px"><div><div style="color:#ff9d2e;font-weight:800;letter-spacing:.18em">CONTACT ENRICHMENT</div><h2 style="font-size:34px;margin:8px 0">Turn a company into the right person</h2><div style="color:#9db0bd;font-size:18px">Research, qualify and save the decision maker without leaving the sales workflow.</div></div><button id="bs14-close" style="height:48px;width:48px;border:0;border-radius:12px;background:#203847;color:white;font-size:26px">×</button></div>
      <div style="margin:24px 0;padding:18px;background:#091923;border-radius:14px"><b>${esc(title)}</b><br><span style="color:#9db0bd">Target company: ${esc(gc || 'Not identified')}</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">
        <div class="bs14-card"><b>1. FIND</b><br><span>Estimator, PM, owner or purchasing contact</span></div><div class="bs14-card"><b>2. VERIFY</b><br><span>Direct phone/email and role confidence</span></div><div class="bs14-card"><b>3. SAVE</b><br><span>Create a usable CRM relationship</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <label>First name<input id="bs14-first"></label><label>Last name<input id="bs14-last"></label><label>Company<input id="bs14-company" value="${esc(gc)}"></label><label>Role<select id="bs14-role"><option>Estimator</option><option>Project Manager</option><option>Developer / Owner</option><option>Purchasing</option><option>General Contractor</option><option>Other</option></select></label><label>Direct email<input id="bs14-email" type="email"></label><label>Direct phone<input id="bs14-phone" type="tel"></label>
      </div>
      <div style="margin-top:16px"><label>Research notes<textarea id="bs14-notes" rows="3" placeholder="Source, extension, responsibilities, bid timing, confidence..."></textarea></label></div>
      <div id="bs14-quality" style="margin:16px 0;padding:14px;border-radius:12px;background:#091923;color:#9db0bd">Add a name plus direct phone or email to make this contact sales-ready.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button id="bs14-copy">Copy research brief</button><button id="bs14-save" class="primary">Save enriched contact</button></div>
    </div>`;
    document.body.appendChild(wrap);
    const style=document.createElement('style'); style.textContent=`#bs14-enrichment-modal label{font-weight:700;color:#9db0bd;letter-spacing:.04em}#bs14-enrichment-modal input,#bs14-enrichment-modal select,#bs14-enrichment-modal textarea{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:13px;border-radius:10px;border:1px solid #35566a;background:#071720;color:#fff;font-size:16px}#bs14-enrichment-modal button{padding:12px 18px;border-radius:10px;border:1px solid #41667b;background:#1b3545;color:#fff;font-weight:800;cursor:pointer}#bs14-enrichment-modal button.primary{background:#ff9d2e;color:#09131a;border-color:#ff9d2e}.bs14-card{padding:16px;border:1px solid #35566a;border-radius:12px;color:#9db0bd}.bs14-card b{color:#ff9d2e}`; wrap.appendChild(style);
    const q=()=>{const n=wrap.querySelector('#bs14-first').value.trim()||wrap.querySelector('#bs14-last').value.trim(), e=wrap.querySelector('#bs14-email').value.trim(), p=phone(wrap.querySelector('#bs14-phone').value), r=wrap.querySelector('#bs14-role').value; let score=(n?35:0)+(e?30:0)+(p.length>=10?30:0)+(r?5:0); wrap.querySelector('#bs14-quality').innerHTML=`<b>Contact readiness: ${score}/100</b> — ${score>=70?'Sales-ready: enough direct information to save and work this relationship.':'Keep researching for a verified name and direct phone/email.'}`;};
    wrap.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',q));
    wrap.querySelector('#bs14-close').onclick=()=>wrap.remove();
    wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};
    wrap.querySelector('#bs14-copy').onclick=async()=>{const brief=`Research ${gc || 'the project company'} for ${title}. Find the estimator, project manager, developer/owner or purchasing decision maker. Verify their role and capture a direct phone and email.`; await navigator.clipboard?.writeText(brief); wrap.querySelector('#bs14-copy').textContent='Copied';};
    wrap.querySelector('#bs14-save').onclick=()=>{
      const first=wrap.querySelector('#bs14-first').value.trim(), last=wrap.querySelector('#bs14-last').value.trim(), co=wrap.querySelector('#bs14-company').value.trim(), role=wrap.querySelector('#bs14-role').value, email=wrap.querySelector('#bs14-email').value.trim(), ph=wrap.querySelector('#bs14-phone').value.trim();
      if(!(first||last) || !(email||phone(ph).length>=10)){alert('Add a contact name and either a direct email or 10-digit phone number first.');return;}
      const duplicate=existingContacts().some(t => (email && t.toLowerCase().includes(email.toLowerCase())) || (phone(ph).length>=7 && phone(t).includes(phone(ph))));
      if(duplicate && !confirm('A contact with this email or phone may already exist. Save anyway?')) return;
      wrap.remove();
      const area=findContactArea(); if(!area){alert('Project contacts form was not found.');return;}
      const labels=[...area.querySelectorAll('label')];
      const set=(name,val)=>{const lab=labels.find(l=>l.textContent.trim().toLowerCase().startsWith(name)); const input=lab?.querySelector('input,select'); if(input){input.value=val; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));}};
      set('first name',first);set('last name',last);set('company',co);set('role',role);set('email',email);set('phone',ph);
      const add=[...area.querySelectorAll('button')].find(b=>/add contact/i.test(b.textContent));
      if(add){add.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>add.click(),250);} else alert('Contact fields were filled. Review them and save the contact.');
    };
    q();
  }

  function mount(){
    if(document.getElementById('bs14-enrich-btn')) return;
    const candidates=[...document.querySelectorAll('button,a')];
    const research=candidates.find(x=>/Research contact/i.test(x.textContent||''));
    const area=findContactArea();
    if(!research && !area) return;
    const btn=document.createElement('button'); btn.id='bs14-enrich-btn'; btn.textContent='Enrich contact'; btn.style.cssText='margin-left:10px;padding:10px 15px;border-radius:10px;border:1px solid #41667b;background:#1b3545;color:#fff;font-weight:800;cursor:pointer;'; btn.onclick=e=>{e.preventDefault();e.stopPropagation();openEnrichment();};
    if(research) research.insertAdjacentElement('afterend',btn); else area.querySelector('h1,h2,h3')?.insertAdjacentElement('afterend',btn);
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(mount)); observer.observe(document.body,{childList:true,subtree:true}); mount();
})();