window.BuildScoutDallasImport = (() => {
  const API_URL =
    "https://www.dallasopendata.com/resource/e7gq-4sah.json?$limit=10";
  async function testFetch() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(
          `Dallas API returned ${response.status}`
        );
      }
      const rows = await response.json();
      console.log(
        "BuildScout Dallas permits:",
        rows
      );
      alert(
        `Success! BuildScout received ${rows.length} Dallas permit records.`
      );
      return rows;
    } catch (error) {
      console.error(
        "Dallas permit import failed:",
        error
      );
      alert(
        "Dallas permit test failed. Open the browser console for details."
      );
      throw error;
    }
  }
  return {
    testFetch
  };
})();
