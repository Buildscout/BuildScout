window.BuildScoutProductionGate = (() => {
  function eligible(project) {
    if (!project || project.fixture_only || project.demo) return false;
    return Boolean(
      project.production_eligible &&
      project.source_verified &&
      project.source_current &&
      project.source_id &&
      project.source_url &&
      project.street_address
    );
  }
  function filter(projects = []) {
    return projects.filter(eligible);
  }
  return { eligible, filter };
})();
