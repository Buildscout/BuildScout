const BuildScoutAuth = (() => {
  const client = supabase.createClient(
    window.BUILDSCOUT_CONFIG.supabaseUrl,
    window.BUILDSCOUT_CONFIG.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  async function getUser() {
    const {
      data: { user },
      error
    } = await client.auth.getUser();

    if (error) {
      console.error("Auth getUser failed:", error);
      return null;
    }

    return user;
  }

  async function signUp({
    firstName,
    lastName,
    email,
    password
  }) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) throw error;

    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();

    if (error) throw error;
  }

  async function resetPassword(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) throw error;
  }

  function onAuthChange(callback) {
    return client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  return {
    client,
    getUser,
    signUp,
    signIn,
    signOut,
    resetPassword,
    onAuthChange
  };
})();

window.BuildScoutAuth = BuildScoutAuth;
