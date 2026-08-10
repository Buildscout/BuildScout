export default async function handler(req, res) {
  try {
    const { street, zip } = req.query;

    if (!street) {
      return res.status(400).json({
        error: "street is required"
      });
    }

    const fullAddress =
      `${street}, Dallas, TX ${zip || ""}`.trim();

    const url =
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
      "?address=" + encodeURIComponent(fullAddress) +
      "&benchmark=Public_AR_Current" +
      "&format=json";

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        error: `Census geocoder returned ${response.status}`
      });
    }

    const data = await response.json();

    const match =
      data?.result?.addressMatches?.[0];

    if (!match) {
      return res.status(404).json({
        error: "No address match found"
      });
    }

    return res.status(200).json({
      lat: Number(match.coordinates.y),
      lon: Number(match.coordinates.x),
      matchedAddress: match.matchedAddress
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
