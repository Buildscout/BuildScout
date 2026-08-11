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

  const text = `
    ${row.permit_type || ""}
    ${row.work_description || ""}
    ${row.land_use || ""}
  `.toLowerCase();

  let score = 35;

  const majorTerms = [
    "new construction",
    "new building",
    "multifamily",
    "multi family",
    "apartment",
    "mixed use",
    "mixed-use",
    "warehouse",
    "industrial",
    "distribution",
    "hotel",
    "office building",
    "retail shell",
    "commercial building"
  ];

  if (majorTerms.some(term => text.includes(term))) {
    score += 25;
  }

  const renovationTerms = [
    "addition",
    "renovation",
    "remodel",
    "expansion",
    "tenant finish",
    "tenant improvement",
    "interior finish",
    "shell building"
  ];

  if (renovationTerms.some(term => text.includes(term))) {
    score += 12;
  }

  if (value >= 10000000) {
    score += 25;
  } else if (value >= 5000000) {
    score += 22;
  } else if (value >= 1000000) {
    score += 18;
  } else if (value >= 500000) {
    score += 14;
  } else if (value >= 250000) {
    score += 8;
  } else if (value > 0 && value < 25000) {
    score -= 10;
  }

  const junkTerms = [
    "sign",
    "water heater",
    "sprinkler repair",
    "service upgrade",
    "electrical service",
    "generator",
    "condenser",
    "hvac replacement",
    "air conditioner",
    "plumbing repair",
    "roof repair",
    "fence",
    "access control",
    "maglock",
    "door access",
    "sewer relay",
    "sewer repair",
    "roof replacement",
  "reroof",
  "re-roof",
  "remove existing roof",
  "roofing",
  "interior remodel only"
  ];

  if (junkTerms.some(term => text.includes(term))) {
    score -= 45;
  }

  return Math.max(0, Math.min(score, 100));
}
  function isGoodLead(row) {
  const value = numberValue(row.value);

  const text = `
    ${row.permit_type || ""}
    ${row.work_description || ""}
    ${row.land_use || ""}
  `.toLowerCase();

  const junkTerms = [
    "sign",
    "water heater",
    "sprinkler repair",
    "service upgrade",
    "electrical service",
    "generator",
    "condenser",
    "hvac replacement",
    "air conditioner",
    "plumbing repair",
    "roof repair",
    "fence",
    "access control",
    "maglock",
    "door access",
    "sewer relay",
    "sewer repair",
    "roof replacement",
"reroof",
"re-roof",
"remove existing roof",
"roofing",
"interior remodel only"
  ];

  const majorTerms = [
    "new construction",
    "new building",
    "multifamily",
    "multi family",
    "apartment",
    "mixed use",
    "mixed-use",
    "warehouse",
    "industrial",
    "distribution",
    "hotel",
    "office building",
    "retail shell",
    "commercial building",
    "addition",
    "renovation",
    "remodel",
    "expansion",
    "tenant finish",
    "tenant improvement",
    "shell building"
  ];

  const isJunk =
    junkTerms.some(term => text.includes(term)) &&
    value < 500000;

  if (isJunk) {
    return false;
  }

  const strongMatch =
    majorTerms.some(term => text.includes(term));

  return (
    strongMatch ||
    value >= 500000 ||
    scorePermit(row) >= 65
  );
}
 
  async function geocodeAddress(streetAddress, zipCode) {
  if (!streetAddress) return null;

  const url =
    "/api/geocode" +
    "?street=" + encodeURIComponent(streetAddress) +
    "&zip=" + encodeURIComponent(zipCode || "");

  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Geocode failed with ${response.status}`);
  }

  return response.json();
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

const normalized = [];

for (const [index, row] of rows.filter(isGoodLead).entries()) {
  const project = normalize(row, index);

  try {
    const geo = await geocodeAddress(
      project.street_address,
      project.zip_code
    );

    if (geo) {
      project.lat = geo.lat;
      project.lon = geo.lon;
    }
  } catch (error) {
    console.warn(
      "Geocode failed for",
      project.street_address,
      error
    );
  }

  normalized.push(project);
}

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
