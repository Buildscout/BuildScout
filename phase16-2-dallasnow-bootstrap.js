window.BuildScoutDallasNowStatus = (() => {
  async function check() {
    try {
      const response = await fetch("/api/dallasnow");
      const data = await response.json().catch(() => ({}));
      return { httpStatus: response.status, ...data };
    } catch (error) {
      return { ready: false, error: error.message };
    }
  }

  return { check };
})();
