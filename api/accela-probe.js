/* Phase 16.3 — Safe Accela connectivity probe
 * Uses only the public agency metadata endpoint. It does not search permit records
 * and does not enable production ingestion.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const agency = process.env.ACCELA_AGENCY || "DALLASTX";
  const url = `https://apis.accela.com/v4/agencies/${encodeURIComponent(agency)}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));

    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      agency,
      endpoint: "/v4/agencies/{agency}",
      upstream_status: response.status,
      agency_resolved: Boolean(body?.result || body?.id || body?.name),
      production_ingestion_enabled: false,
      message: response.ok
        ? "Accela agency endpoint responded. Record-search access still must be authorized and verified separately."
        : "Accela agency endpoint did not resolve successfully. Verify the agency code/configuration before proceeding."
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      agency,
      production_ingestion_enabled: false,
      error: "Accela connectivity probe failed.",
      detail: error.message
    });
  }
};
