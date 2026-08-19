/* Phase 16.1 — Dallas production-data guard
 * The legacy City of Dallas OpenData Building Permits dataset is official but historical.
 * It must not feed current production opportunities.
 */
window.BuildScoutProductionSources = (() => {
  const sources = {
    dallasBuildingHistorical: {
      id: "dallas-building-permits-historical",
      jurisdiction: "Dallas, TX",
      country: "United States",
      kind: "official_public_record",
      name: "City of Dallas OpenData — Building Permits (historical)",
      url: "https://www.dallasopendata.com/Services/Building-Permits/e7gq-4sah",
      api: "https://www.dallasopendata.com/resource/e7gq-4sah.json",
      active: false,
      productionEligible: false,
      dataLastUpdated: "2020-08-30",
      note: "Historical dataset. Active Dallas permit tracking migrated to DallasNow."
    },
    dallasNow: {
      id: "dallas-now-building",
      jurisdiction: "Dallas, TX",
      country: "United States",
      kind: "official_public_record",
      name: "City of Dallas DallasNow / Accela Citizen Access",
      url: "https://aca-prod.accela.com/DALLASTX/Cap/CapHome.aspx?TabName=Building&module=Building",
      active: true,
      productionEligible: true,
      connectorStatus: "adapter-required",
      note: "Current official City of Dallas permit search system. BuildScout must ingest only through a compliant public/authorized connector."
    }
  };

  function productionEligible(id){ return Boolean(sources[id]?.productionEligible); }
  function get(id){ return sources[id] || null; }
  function all(){ return Object.values(sources); }
  return { sources, get, all, productionEligible };
})();

(() => {
  const legacy = window.BuildScoutDallasImport;
  if (!legacy || legacy.__phase16Guarded) return;

  const historicalImport = legacy.importToSupabase?.bind(legacy);
  const historicalPreview = legacy.preview?.bind(legacy);

  async function blockedProductionImport(){
    const source = window.BuildScoutProductionSources.get("dallasBuildingHistorical");
    const error = new Error(
      `${source.name} is not current production inventory. Its permit data stops at ${source.dataLastUpdated}. ` +
      `Dallas active permit tracking is now in DallasNow. BuildScout blocked this import so historical records cannot be presented as current opportunities.`
    );
    console.error(error);
    alert(
      "Import blocked: the old Dallas OpenData permit feed is historical, not current. " +
      "BuildScout will use DallasNow for production Dallas opportunities once the current-source connector is enabled."
    );
    throw error;
  }

  async function previewHistorical(){
    const rows = await historicalPreview();
    return (rows || []).map(p => ({...p, data_status:"historical", production_eligible:false}));
  }

  window.BuildScoutDallasImport = {
    ...legacy,
    __phase16Guarded:true,
    importToSupabase: blockedProductionImport,
    preview: previewHistorical,
    historicalImportToSupabase: historicalImport,
    sourceStatus(){
      return {
        historical: window.BuildScoutProductionSources.get("dallasBuildingHistorical"),
        current: window.BuildScoutProductionSources.get("dallasNow")
      };
    }
  };
})();
