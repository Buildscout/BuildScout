window.BuildScoutSourceAdapters = (() => {
  const adapters = new Map();

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function register(adapter) {
    if (!adapter || !clean(adapter.id)) throw new Error("Source adapter requires an id.");
    if (typeof adapter.normalizeRecord !== "function") throw new Error(`Adapter ${adapter.id} requires normalizeRecord().`);
    adapters.set(adapter.id, adapter);
    return adapter;
  }

  function get(id) {
    return adapters.get(id) || null;
  }

  function list() {
    return Array.from(adapters.values()).map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      jurisdiction: adapter.jurisdiction,
      country: adapter.country,
      authority: adapter.authority,
      productionEligible: adapter.productionEligible === true
    }));
  }

  function validateProvenance(project) {
    const errors = [];
    if (!clean(project?.source)) errors.push("missing source name");
    if (!clean(project?.source_id || project?.permit_number)) errors.push("missing source record id");
    if (!clean(project?.source_url)) errors.push("missing source URL");
    if (!clean(project?.source_jurisdiction)) errors.push("missing source jurisdiction");
    if (!clean(project?.source_authority)) errors.push("missing source authority");
    if (!clean(project?.last_source_check)) errors.push("missing verification timestamp");
    if (project?.source_verified !== true) errors.push("source not verified");
    if (project?.production_eligible !== true) errors.push("record not production eligible");
    return { valid: errors.length === 0, errors };
  }

  function normalize(adapterId, record, index = 0) {
    const adapter = get(adapterId);
    if (!adapter) throw new Error(`Unknown source adapter: ${adapterId}`);
    const project = adapter.normalizeRecord(record, index);
    const provenance = validateProvenance(project);
    return { project, provenance };
  }

  function prepare(adapterId, records = []) {
    const accepted = [];
    const rejected = [];
    records.forEach((record, index) => {
      try {
        const { project, provenance } = normalize(adapterId, record, index);
        if (provenance.valid) accepted.push(project);
        else rejected.push({ record, errors: provenance.errors });
      } catch (error) {
        rejected.push({ record, errors: [error.message] });
      }
    });
    return { accepted, rejected, adapter: get(adapterId) };
  }

  async function importVerified(adapterId, records = []) {
    const { accepted, rejected, adapter } = prepare(adapterId, records);
    if (!adapter?.productionEligible) throw new Error("This source is not approved for production ingestion.");
    if (!accepted.length) throw new Error("No verified source records were eligible for import.");
    if (!window.BuildScoutBackend?.importProjects) throw new Error("BuildScout backend importer is unavailable.");
    const saved = await window.BuildScoutBackend.importProjects(accepted);
    return { saved, rejected, adapter: adapter.id };
  }

  return { register, get, list, normalize, prepare, importVerified, validateProvenance };
})();
