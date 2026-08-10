window.BuildScoutBackend = (() => {
  let client = null;

  function configured() {
    const c = window.BUILDSCOUT_CONFIG || {};

    return Boolean(
      c.supabaseUrl &&
      c.supabasePublishableKey
    );
  }

  function init() {
    if (!configured()) {
      throw new Error("Supabase configuration is missing.");
    }

    client = window.supabase.createClient(
      window.BUILDSCOUT_CONFIG.supabaseUrl,
      window.BUILDSCOUT_CONFIG.supabasePublishableKey
    );

    return client;
  }

  function getClient() {
    return client;
  }

  async function signUp(email, password, fullName = "") {
    if (!client) init();

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    return data;
  }

  async function signIn(email, password) {
    if (!client) init();

    const { data, error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    return data;
  }

  async function signOut() {
    if (!client) return;

    const { error } =
      await client.auth.signOut();

    if (error) throw error;
  }

  async function getSession() {
    if (!client) init();

    const { data, error } =
      await client.auth.getSession();

    if (error) throw error;

    return data.session;
  }

  async function getProjects() {
    if (!client) init();

    const { data, error } =
      await client
        .from("projects")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) throw error;

    return data || [];
  }

  async function getSavedProjects(userId) {
    if (!client) init();

    const { data, error } =
      await client
        .from("saved_projects")
        .select("project_id")
        .eq("user_id", userId);

    if (error) throw error;

    return data || [];
  }

  async function saveProject(userId, projectId) {
    if (!client) init();

    const { data, error } =
      await client
        .from("saved_projects")
        .upsert({
          user_id: userId,
          project_id: projectId
        });

    if (error) throw error;

    return data;
  }

  async function unsaveProject(userId, projectId) {
    if (!client) init();

    const { error } =
      await client
        .from("saved_projects")
        .delete()
        .eq("user_id", userId)
        .eq("project_id", projectId);

    if (error) throw error;
  }

  async function getPipeline(userId) {
    if (!client) init();

    const { data, error } =
      await client
        .from("pipeline_items")
        .select("*")
        .eq("user_id", userId);

    if (error) throw error;

    return data || [];
  }

  async function updatePipeline(
    userId,
    projectId,
    stage
  ) {
    if (!client) init();

    const { data, error } =
      await client
        .from("pipeline_items")
        .upsert({
          user_id: userId,
          project_id: projectId,
          stage,
          updated_at:
            new Date().toISOString()
        });

    if (error) throw error;

    return data;
  }

  return {
    configured,
    init,
    getClient,
    signUp,
    signIn,
    signOut,
    getSession,
    getProjects,
    getSavedProjects,
    saveProject,
    unsaveProject,
    getPipeline,
    updatePipeline
  };
})();
