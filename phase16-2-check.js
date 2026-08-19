window.BuildScoutDallasNowSelfCheck = async function () {
  const adapter = window.BuildScoutDallasNow;
  if (!adapter) return { ok: false, reason: "adapter-not-loaded" };
  const sample = adapter.prepare([{
    permit_number: "SELF-CHECK",
    street_address: "TEST ONLY",
    description: "Adapter contract self-check",
    source_url: adapter.SOURCE.portalUrl
  }]);
  return {
    ok: sample.accepted.length === 1,
    adapter: true,
    productionFeedConnected: false,
    note: "Self-check validates code only; it does not represent a real Dallas permit."
  };
};
