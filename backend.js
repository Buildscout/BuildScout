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
    if (client) return client;
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
async function importProjects(projectList) {
  if (!client) init();

  if (!Array.isArray(projectList) || projectList.length === 0) {
    return [];
  }

  const rows = projectList
    .filter(p => p && p.permit_number)
    .map(p => ({
  name: p.name || "Dallas Building Permit",
city: p.city || "Dallas, TX",
street_address: p.street_address || null,
zip_code: p.zip_code || null,
latitude: p.lat ?? null,
longitude: p.lon ?? null,
project_type: p.type || "Commercial",
stage: p.stage || "Permit approved",
estimated_value: Number(p.value || 0),
opportunity_score: Number(p.score || 70),
units: p.units ?? null,
expected_start: null,
general_contractor: p.contractor || null,
permit_number: String(p.permit_number),
source_name: p.source || "City of Dallas OpenData",
source_url:
  "https://www.dallasopendata.com/Services/Building-Permits/e7gq-4sah",
last_verified: new Date().toISOString().slice(0, 10)
    }));

const savedRows = [];

for (const row of rows) {
  const { data: existing, error: lookupError } =
    await client
      .from("projects")
      .select("id")
      .eq("source_name", "City of Dallas OpenData")
      .eq("permit_number", row.permit_number)
      .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { data, error } =
      await client
        .from("projects")
        .update(row)
        .eq("id", existing.id)
        .select();

    if (error) throw error;

    if (data) {
      savedRows.push(...data);
    }
  } else {
    const { data, error } =
      await client
        .from("projects")
        .insert(row)
        .select();

    if (error) throw error;

    if (data) {
      savedRows.push(...data);
    }
  }
}

return savedRows;
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
    importProjects,
    getSavedProjects,
    saveProject,
    unsaveProject,
    getPipeline,
    updatePipeline
  };
})();
