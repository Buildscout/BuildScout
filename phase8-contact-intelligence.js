(() => {
  const phoneRe = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/;
  const addressRe = /\b\d{2,6}\s+[A-Z0-9 .'-]+?(?:STREET|ST|ROAD|RD|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR|LANE|LN|COURT|CT|PARKWAY|PKWY|HIGHWAY|HWY|EXPY|WAY)\b/i;
  const suiteRe = /\s*,?\s*(?:SUITE|STE|UNIT|#)\s*[A-Z0-9-]+/i;
  const cityStateZipRe = /\s*,?\s*[A-Z .'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/i;

  function cleanCompany(raw) {
    let s = String(raw || '').replace(/\s+/g, ' ').trim();
    const phone = s.match(phoneRe)?.[0] || '';
    if (phone) s = s.replace(phone, ' ');
    const address = s.match(addressRe)?.[0] || '';
    if (address) s = s.slice(0, Math.max(0, s.toUpperCase().indexOf(address.toUpperCase())));
    s = s.replace(suiteRe, ' ').replace(cityStateZipRe, ' ').replace(/[ ,;-]+$/g, '').trim();
    return s || String(raw || '').trim();
  }

  function parse(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    const phone = text.match(phoneRe)?.[0] || '';
    const addressStart = text.search(addressRe);
    const company = cleanCompany(text);
    const address = addressStart >= 0 ? text.slice(addressStart).replace(phoneRe, '').trim().replace(/[ ,;-]+$/g, '') : '';
    return { raw: text, company, phone, address };
  }

  function patchPhase7() {
    const p7 = window.BuildScoutPhase7;
    if (!p7 || p7.__contactIntelligence) return;
    p7.__contactIntelligence = true;
  }

  function enhanceCopilot() {
    const root = document.querySelector('[data-p7]');
    if (!root || root.dataset.p8 === '1') return;
    const who = root.querySelector('.p7-card b');
    if (!who) return;
    const parsed = parse(who.textContent);
    if (!parsed.company || parsed.company === parsed.raw) return;
    who.textContent = parsed.company;
    const meta = document.createElement('div');
    meta.className = 'p8-contact-meta';
    meta.innerHTML = `${parsed.phone ? `<span>☎ ${escapeHtml(parsed.phone)}</span>` : ''}${parsed.address ? `<span>${escapeHtml(parsed.address)}</span>` : ''}`;
    who.parentElement.appendChild(meta);
    root.dataset.p8 = '1';
    const state = window.__buildScoutCopilot;
    if (state?.a) {
      state.a.who = parsed.company;
      if (parsed.phone) state.a.phone = parsed.phone;
      state.a.why = `Known general contractor — call ${parsed.company} and ask for the estimator or project manager handling this job.`;
      const reason = root.querySelector('.p7-reason');
      if (reason) reason.innerHTML = `<b>Why this project:</b> ${escapeHtml(state.a.reason)}<br><b>Why this contact:</b> ${escapeHtml(state.a.why)}`;
    }
  }

  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function styles() {
    if (document.getElementById('phase8-css')) return;
    const s = document.createElement('style');
    s.id = 'phase8-css';
    s.textContent = `.p8-contact-meta{margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;color:#78909f;font-size:10px;font-weight:600}.p8-contact-meta span{display:block}`;
    document.head.appendChild(s);
  }

  let timer;
  function run() { styles(); patchPhase7(); enhanceCopilot(); }
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 100); }).observe(document.documentElement, {childList:true,subtree:true});
  window.addEventListener('load', run);
  window.BuildScoutPhase8 = { parseContact: parse, cleanCompany, run };
})();
