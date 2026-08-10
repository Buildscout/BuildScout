window.BuildScoutDallasImport = (() => {
  const API_URL =
  "https://www.dallasopendata.com/resource/e7gq-4sah.json?$limit=500&$order=issued_date DESC";
  function numberValue(v) {
    const n = Number(
      String(v || "")
        .replace(/[$,]/g, "")
    );
    return Number.isFinite(n) ? n : 0;
  }
  function classifyType(row) {
    const text =
      `${row.permit_type || ""} ${row.work_description || ""}`
        .toLowerCase();
    if (
      text.includes("multi family") ||
      text.includes("multifamily") ||
      text.includes("apartment")
    ) {
      return "Multifamily";
    }
    if (
      text.includes("warehouse") ||
      text.includes("industrial")
    ) {
      return "Industrial";
    }
    if (
      text.includes("commercial") ||
      text.includes("office") ||
      text.includes("retail")
    ) {
      return "Commercial";
    }
    return "Commercial";
  }
  function scorePermit(row) {
    const value = numberValue(row.value);
    let score = 55;
    if (value >= 1000000) score += 10;
    if (value >= 5000000) score += 8;
    if (value >= 10000000) score += 7;
    const text =
      `${row.permit_type || ""} ${row.work_description || ""}`
        .toLowerCase();
    if (text.includes("new construction")) {
      score += 10;
    }
    return Math.min(score, 100);
  }
  function isGoodLead(row) {
  const text =
    `${row.permit_type || ""} ${row.work_description || ""}`
      .toLowerCase();

  const value = numberValue(row.value);

  const junkTerms = [
    "water heater",
    "sprinkler",
    "service upgrade",
    "electrical service",
    "generator",
    "condenser",
    "hvac replacement",
    "air conditioner",
    "plumbing repair",
    "roof repair",
    "fence"
  ];

  if (junkTerms.some(term => text.includes(term))) {
    return false;
  }

  const strongTerms = [
    "new construction",
    "multifamily",
    "multi family",
    "apartment",
    "commercial",
    "warehouse",
    "industrial",
    "office",
    "retail",
    "addition",
    "renovation",
    "remodel"
  ];

  const strongMatch =
    strongTerms.some(term => text.includes(term));

  return strongMatch || value >= 500000;
}
  async function geocodeAddress(streetAddress, zipCode) {
  if (!streetAddress) return null;

  const fullAddress =
    `${streetAddress}, Dallas, TX ${zipCode || ""}`.trim();

  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    "?address=" + encodeURIComponent(fullAddress) +
    "&benchmark=Public_AR_Current" +
    "&format=json";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Census geocoder returned ${response.status}`);
  }

  const data = await response.json();

  const match =
    data?.result?.addressMatches?.[0];

  if (!match) {
    return null;
  }

  return {
    lat: Number(match.coordinates.y),
    lon: Number(match.coordinates.x),
    matchedAddress: match.matchedAddress
  };
}
  function normalize(row, index) {
    const permitNumber =
      row.permit_number ||
      `DAL-${Date.now()}-${index}`;
    const description =
      row.work_description ||
      row.permit_type ||
      "Dallas Building Permit";
    return {
      id: `dallas-${permitNumber}`,
      name:
        description.length > 65
          ? `${description.slice(0, 62)}...`
          : description,
      city: "Dallas, TX",
      street_address: row.street_address || "",
zip_code: row.zip_code || "",
      type: classifyType(row),
      stage: "Permit approved",
      value: numberValue(row.value),
      units: null,
      permit_number: permitNumber,
      contractor:
        row.contractor || "",
      description:
        row.work_description || "",
      issued_date:
        row.issued_date || "",
      source:
        "City of Dallas OpenData",
      source_id:
        permitNumber,
      score:
        scorePermit(row),
      lat: null,
      lon: null,
      raw: row
    };
  }
  async function fetchPermits() {
    const response =
      await fetch(API_URL);
    if (!response.ok) {
      throw new Error(
        `Dallas API returned ${response.status}`
      );
    }
    return response.json();
  }
  async function preview() {
    try {
      const rows =
        await fetchPermits();
      const normalized =
  rows
    .filter(isGoodLead)
    .map(normalize);
      console.log(
        "Raw Dallas permit rows:",
        rows
      );
      console.log(
        "Normalized BuildScout projects:",
        normalized
      );
      alert(
        `Success! Converted ${normalized.length} Dallas permits into BuildScout projects.`
      );
      return normalized;
    } catch (error) {
      console.error(
        "Dallas permit conversion failed:",
        error
      );
      alert(
        "Dallas conversion failed. Check the Console."
      );
      throw error;
    }
  }

 async function importToSupabase() {
  try {
    const rows = await fetchPermits();
    const normalized =
  rows
    .filter(isGoodLead)
    .map(normalize);

    const saved =
      await window.BuildScoutBackend.importProjects(
        normalized
      );

    console.log(
      "Dallas permits saved to Supabase:",
      saved
    );

    alert(
      `Success! ${saved.length} new Dallas permits were saved to Supabase.`
    );

    return saved;

  } catch (error) {
    console.error(
      "Dallas Supabase import failed:",
      error
    );

    alert(
      `Dallas import failed: ${error.message}`
    );

    throw error;
  }
} 
  
  return {
    fetchPermits,
    normalize,
    preview,
    importToSupabase,
    geocodeAddress
  };

})();
