/* BuildScout Phase 16 — Real Project Data Foundation
 * Shared normalization, provenance, verification, dedupe and publish-gating helpers.
 * Designed for official public records and licensed/authorized sources across the U.S.; Canada follows.
 */
window.BuildScoutRealData = (() => {
  const VERSION = "16.0";
  const SOURCE_TYPES = Object.freeze({
    OFFICIAL: "official_public_record",
    LICENSED: "licensed_provider",
    AUTHORIZED: "authorized_document",
    USER: "user_supplied"
  });
  const CONFIDENCE = Object.freeze({ VERIFIED:"verified", SOURCE_BACKED:"source-backed", INFERRED:"inferred", UNKNOWN:"unknown" });

  const text = v => String(v ?? "").trim();
  const lower = v => text(v).toLowerCase();
  const digits = v => text(v).replace(/\D/g, "");
  const isoDate = v => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const slug = v => lower(v).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  function normalize(raw={}, source={}) {
    const address = text(raw.address || raw.project_address || raw.location);
    const city = text(raw.city);
    const region = text(raw.state || raw.region || raw.province);
    const postalCode = text(raw.zip || raw.zip_code || raw.postal_code);
    const country = text(raw.country || "United States");
    const permitNumber = text(raw.permit_number || raw.permit || raw.record_id);
    const sourceUrl = text(source.url || raw.source_url);
    const sourceName = text(source.name || raw.source || "Unknown source");
    const sourceType = source.type || SOURCE_TYPES.OFFICIAL;
    const fetchedAt = isoDate(source.fetched_at || new Date().toISOString());

    const project = {
      schemaVersion: VERSION,
      externalId: text(raw.external_id || permitNumber),
      name: text(raw.project_name || raw.name || raw.description || "Untitled project"),
      description: text(raw.description || raw.scope || raw.work_description),
      projectType: text(raw.project_type || raw.type),
      stage: text(raw.stage || raw.status),
      value: Number(raw.value || raw.valuation || raw.estimated_cost || 0) || 0,
      permitNumber,
      permitDate: isoDate(raw.permit_date || raw.issued_date || raw.issue_date),
      location: { address, city, region, postalCode, country },
      team: {
        owner: text(raw.owner || raw.developer_owner),
        generalContractor: text(raw.general_contractor || raw.gc || raw.contractor),
        architect: text(raw.architect)
      },
      contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
      documents: normalizeDocuments(raw.documents || raw.plans_specs || []),
      provenance: [{ sourceName, sourceType, sourceUrl, fetchedAt, externalId: text(source.external_id || permitNumber) }],
      verification: { status: CONFIDENCE.SOURCE_BACKED, checkedAt: fetchedAt, issues: [] }
    };
    project.dedupeKey = makeDedupeKey(project);
    project.verification = verify(project);
    return project;
  }

  function normalizeDocuments(docs) {
    if (!Array.isArray(docs)) docs = docs ? [docs] : [];
    return docs.map(d => typeof d === "string" ? { title:"Project document", url:d, access:"linked" } : ({
      title:text(d.title || d.name || "Project document"),
      url:text(d.url),
      type:text(d.type || d.document_type),
      access:text(d.access || "linked"),
      source:text(d.source),
      authorized:d.authorized === true
    })).filter(d => d.url || d.title);
  }

  function makeDedupeKey(p) {
    const permit = lower(p.permitNumber);
    if (permit) return `permit:${slug(p.location.region)}:${permit}`;
    return `project:${slug(p.location.address)}:${slug(p.location.city)}:${slug(p.name)}`;
  }

  function verify(p) {
    const issues=[];
    const provenance=p.provenance?.[0] || {};
    if (!text(p.name) || p.name === "Untitled project") issues.push("missing_project_name");
    if (!text(p.location?.address) && !text(p.permitNumber)) issues.push("missing_location_or_permit");
    if (!text(provenance.sourceUrl)) issues.push("missing_source_url");
    if (!text(provenance.sourceName) || provenance.sourceName === "Unknown source") issues.push("missing_source_name");
    if (!Object.values(SOURCE_TYPES).includes(provenance.sourceType)) issues.push("unapproved_source_type");
    const restrictedDocs=(p.documents||[]).filter(d => d.access === "restricted" && !d.authorized);
    if (restrictedDocs.length) issues.push("unauthorized_restricted_documents");
    let status=CONFIDENCE.VERIFIED;
    if (issues.length) status=CONFIDENCE.UNKNOWN;
    else if (!p.permitNumber && provenance.sourceType !== SOURCE_TYPES.LICENSED) status=CONFIDENCE.SOURCE_BACKED;
    return {status, checkedAt:new Date().toISOString(), issues};
  }

  function canPublish(p) {
    const v=verify(p);
    return { ok: v.status !== CONFIDENCE.UNKNOWN, verification:v };
  }

  function merge(existing, incoming) {
    if (!existing) return incoming;
    const out={...existing,...incoming};
    out.location={...(existing.location||{}),...(incoming.location||{})};
    out.team={...(existing.team||{}),...(incoming.team||{})};
    out.contacts=[...(existing.contacts||[]),...(incoming.contacts||[])];
    out.documents=[...(existing.documents||[]),...(incoming.documents||[])];
    out.provenance=[...(existing.provenance||[]),...(incoming.provenance||[])];
    out.dedupeKey=makeDedupeKey(out);
    out.verification=verify(out);
    return out;
  }

  function audit(records=[]) {
    const seen=new Map();
    const report={total:records.length, verified:0, sourceBacked:0, blocked:0, duplicates:[], issues:{}};
    records.forEach((p,i)=>{
      const v=verify(p);
      if(v.status===CONFIDENCE.VERIFIED) report.verified++;
      else if(v.status===CONFIDENCE.SOURCE_BACKED) report.sourceBacked++;
      else report.blocked++;
      v.issues.forEach(issue=>report.issues[issue]=(report.issues[issue]||0)+1);
      const key=p.dedupeKey || makeDedupeKey(p);
      if(seen.has(key)) report.duplicates.push({key, first:seen.get(key), duplicate:i}); else seen.set(key,i);
    });
    return report;
  }

  return { VERSION, SOURCE_TYPES, CONFIDENCE, normalize, verify, canPublish, makeDedupeKey, merge, audit };
})();
