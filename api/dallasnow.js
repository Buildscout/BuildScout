/*
 * DallasNow connector boundary.
 *
 * DallasNow is the City of Dallas' current Accela Citizen Access system. We do not
 * scrape authenticated pages or fabricate records. This endpoint is intentionally
 * disabled until a documented public/authorized machine-readable feed is configured.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(503).json({
    ready: false,
    source: "City of Dallas DallasNow / Accela Citizen Access",
    portal: "https://aca-prod.accela.com/DALLASTX",
    official_info: "https://dallascityhall.com/departments/sustainabledevelopment/Pages/DallasNow.aspx",
    reason: "A documented public or authorized DallasNow machine-readable feed has not yet been configured.",
    requirement: "Configure an approved DallasNow/Accela API or official export before enabling automated production ingestion."
  });
};
