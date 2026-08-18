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

  // Phase 7 consumes this parser directly. Keeping Phase 8 DOM-passive avoids
  // observer feedback loops and guarantees a single Copilot card per project.
  window.BuildScoutPhase8 = { parseContact: parse, cleanCompany };
})();
