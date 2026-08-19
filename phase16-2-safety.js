window.BuildScoutAssertRealProject = function (project) {
  if (project?.demo || project?.fixture_only) {
    throw new Error("Demo/test project cannot be published as production inventory.");
  }
  if (!project?.source_verified || !project?.source_id || !project?.source_url) {
    throw new Error("Project lacks verified source evidence.");
  }
  return project;
};
