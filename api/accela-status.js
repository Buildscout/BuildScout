/* Phase 16.3 — Accela readiness status
 * Reports whether BuildScout is configured to talk to Accela without ever exposing secrets.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const agency = process.env.ACCELA_AGENCY || "DALLASTX";
  const environment = process.env.ACCELA_ENVIRONMENT || "PROD";
  const appId = Boolean(process.env.ACCELA_APP_ID);
  const appSecret = Boolean(process.env.ACCELA_APP_SECRET);
  const accessToken = Boolean(process.env.ACCELA_ACCESS_TOKEN);

  const credentialMode = accessToken ? "access-token" : (appId && appSecret ? "app-credentials" : "unconfigured");
  const configured = credentialMode !== "unconfigured";

  return res.status(200).json({
    provider: "Accela Civic Platform",
    agency,
    environment,
    base_url: "https://apis.accela.com",
    configured,
    credential_mode: credentialMode,
    secrets_exposed: false,
    production_ingestion_enabled: false,
    next_requirement: configured
      ? "Verify Dallas agency access and record-search permissions before enabling production ingestion."
      : "Configure approved Accela application credentials or an authorized access token in server environment variables."
  });
};
