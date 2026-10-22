window.BuildScoutBackend = (() => {
  let client = null;
  let lastAccessToken = null;

  function configured() { const c = window.BUILDSCOUT_CONFIG || {}; return Boolean(c.supabaseUrl && c.supabasePublishableKey); }
  function init() { if (client) return client; if (!configured()) throw new Error("Supabase configuration is missing."); client = window.supabase.createClient(window.BUILDSCOUT_CONFIG.supabaseUrl, window.BUILDSCOUT_CONFIG.supabasePublishableKey); return client; }
  function getClient() { return client; }
  async function signUp(email,password,firstName="",lastName="") { if(!client)init(); const {data,error}=await client.auth.signUp({email,password,options:{data:{first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`.trim()}}}); if(error)throw error; return data; }
  async function signIn(email,password){
    if(!client)init();

    // signInWithPassword already establishes and persists the Supabase
    // session. Do not immediately call setSession/getUser again here:
    // doing so can contend with Supabase's auth lock and leave the UI stuck
    // on "Signing in…" even though the credentials were accepted.
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;

    if(!data?.session?.access_token||!data?.session?.refresh_token||!data?.user?.id){
      throw new Error("Sign-in succeeded but no authenticated session was returned.");
    }

    lastAccessToken = data.session.access_token;
    return data;
  }
  async function signOut(){if(!client)return;const{error}=await client.auth.signOut();lastAccessToken=null;if(error)throw error;}
  async function getSession(){if(!client)init();const{data,error}=await client.auth.getSession();if(error)throw error;return data.session;}
  async function getProjects(accessToken=null){
    if(!client)init();
    const session=accessToken?null:await getSession();
    const token=accessToken||session?.access_token;
    if(!token)throw new Error("No authenticated session token is available.");

    // Load a bounded first page. The old client downloaded and rendered the
    // entire 30k+ project table at sign-in, which made the UI extremely slow
    // and could leave the screen looking empty while the request ran.
    const response=await fetch("/api/projects?offset=0&limit=500",{
      headers:{Authorization:`Bearer ${token}`}
    });
    let payload=null;
    try{payload=await response.json();}catch(_){}
    if(!response.ok){
      throw new Error(payload?.message||payload?.error||`Projects API returned HTTP ${response.status}.`);
    }

    const rows=Array.isArray(payload?.data)?payload.data:[];
    if(payload?.total>0 && rows.length===0){
      throw new Error(`Projects API reports ${payload.total} projects but returned 0 rows.`);
    }

    console.log("BuildScout server project query:",{
      loaded:rows.length,
      total:Number(payload?.total||rows.length)
    });
    return rows;
  }

  async function getProjectDocuments(projectId){if(!client)init();const{data,error}=await client.from("project_documents").select("*").eq("project_id",projectId).eq("is_public",true).order("document_type",{ascending:true}).order("sheet_number",{ascending:true});if(error)throw error;return data||[];}
  async function getProjectDocumentCounts(){if(!client)init();const counts={};let from=0;const size=1000;while(true){const{data,error}=await client.from("project_documents").select("project_id").eq("is_public",true).range(from,from+size-1);if(error)throw error;(data||[]).forEach(row=>{const key=String(row.project_id);counts[key]=(counts[key]||0)+1;});if(!data||data.length<size)break;from+=size;}return counts;}
  async function getProjectIntelligence(projectId){if(!client)init();const [sourcesResult,companiesResult,contactsResult]=await Promise.all([client.from("project_sources").select("*").eq("project_id",projectId).order("verified_at",{ascending:false}),client.from("project_companies").select("*").eq("project_id",projectId).order("role",{ascending:true}),client.from("project_contacts").select("*").eq("project_id",projectId).order("full_name",{ascending:true})]);if(sourcesResult.error)throw sourcesResult.error;if(companiesResult.error)throw companiesResult.error;if(contactsResult.error)throw contactsResult.error;const sources=sourcesResult.data||[],companies=companiesResult.data||[],contacts=contactsResult.data||[];const sourceById=new Map(sources.map(x=>[x.id,x]));const contactCountByCompany={};contacts.forEach(x=>{if(x.company_id)contactCountByCompany[x.company_id]=(contactCountByCompany[x.company_id]||0)+1;});return{sources,contacts,companies:companies.map(x=>({...x,source:sourceById.get(x.source_id)||null,contact_count:contactCountByCompany[x.id]||0}))};}
  async function importProjects(projectList){
    if(!client)init();
    if(!Array.isArray(projectList)||projectList.length===0)return[];
    const rows=projectList.filter(p=>p&&p.permit_number&&p.source_verified===true&&p.production_eligible===true).map(p=>({
      name:p.name||`Permit ${p.permit_number}`,
      city:p.city||null,
      street_address:p.street_address||null,
      zip_code:p.zip_code||null,
      latitude:Number.isFinite(Number(p.lat))?Number(p.lat):null,
      longitude:Number.isFinite(Number(p.lon))?Number(p.lon):null,
      project_type:p.type||"Construction",
      stage:p.stage||"Issued",
      estimated_value:p.value==null||p.value===""?null:Number(p.value),
      opportunity_score:Number(p.score||70),
      units:p.units==null||p.units===""?null:Number(p.units),
      expected_start:null,
      general_contractor:p.contractor||null,
      permit_number:String(p.permit_number),
      source_name:p.source||null,
      source_url:p.source_url||null,
      last_verified:p.last_source_check?String(p.last_source_check).slice(0,10):new Date().toISOString().slice(0,10)
    }));
    const savedRows=[];
    for(const row of rows){
      const{data:existing,error:lookupError}=await client.from("projects").select("id").eq("source_name",row.source_name).eq("permit_number",row.permit_number).maybeSingle();
      if(lookupError)throw lookupError;
      if(existing){const{data,error}=await client.from("projects").update(row).eq("id",existing.id).select();if(error)throw error;if(data)savedRows.push(...data);}
      else{const{data,error}=await client.from("projects").insert(row).select();if(error)throw error;if(data)savedRows.push(...data);}
    }
    return savedRows;
  }
  async function userStateRequest(body={}, query="", accessToken=null){
    const session=accessToken?null:await getSession();
    const token=accessToken||session?.access_token||lastAccessToken;
    if(!token)throw new Error("No authenticated session token is available.");
    const response=await fetch("/api/user-state"+query,{
      method:body&&Object.keys(body).length?"POST":"GET",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:body&&Object.keys(body).length?JSON.stringify(body):undefined
    });
    let payload=null;try{payload=await response.json();}catch(_){}
    if(!response.ok)throw new Error(payload?.message||payload?.error||`User state API returned HTTP ${response.status}.`);
    return payload?.data||[];
  }
  async function getSavedProjects(userId,accessToken=null){const rows=await userStateRequest({}, "?type=saved",accessToken);return rows;}
  async function saveProject(userId,projectId,accessToken=null){return userStateRequest({type:"saved",action:"save",projectId},"",accessToken);}
  async function unsaveProject(userId,projectId,accessToken=null){await userStateRequest({type:"saved",action:"remove",projectId},"",accessToken);}
  async function getPipeline(userId,accessToken=null){return userStateRequest({}, "?type=pipeline",accessToken);}
  async function removePipelineItem(userId,projectId,accessToken=null){await userStateRequest({type:"pipeline",action:"remove",projectId},"",accessToken);}
  async function updatePipeline(userId,projectId,stage,notes=undefined,followUpAt=undefined,crm={},accessToken=null){
    const body={type:"pipeline",action:"upsert",projectId,stage,notes,follow_up_at:followUpAt||null};
    ["opportunity_value","probability","expected_close_date","next_action","lost_reason"].forEach(k=>{if(crm[k]!==undefined)body[k]=crm[k]||null;});
    return userStateRequest(body,"",accessToken);
  }
  async function getContacts(userId,projectId){if(!client)init();const{data,error}=await client.from("crm_contacts").select("*").eq("user_id",userId).eq("project_id",projectId).order("is_primary",{ascending:false}).order("created_at",{ascending:true});if(error)throw error;return data||[];}
  async function saveContact(contact){if(!client)init();const row={...contact,updated_at:new Date().toISOString()};const query=row.id?client.from("crm_contacts").update(row).eq("id",row.id).eq("user_id",row.user_id):client.from("crm_contacts").insert(row);const{data,error}=await query.select().single();if(error)throw error;return data;}
  async function deleteContact(userId,contactId){if(!client)init();const{error}=await client.from("crm_contacts").delete().eq("id",contactId).eq("user_id",userId);if(error)throw error;}
  async function setPrimaryContact(userId,projectId,contactId){if(!client)init();const{error:clearError}=await client.from("crm_contacts").update({is_primary:false,updated_at:new Date().toISOString()}).eq("user_id",userId).eq("project_id",projectId);if(clearError)throw clearError;const{data,error}=await client.from("crm_contacts").update({is_primary:true,updated_at:new Date().toISOString()}).eq("id",contactId).eq("user_id",userId).eq("project_id",projectId).select().single();if(error)throw error;return data;}
  async function getActivities(userId,projectId){if(!client)init();const{data,error}=await client.from("crm_activities").select("*").eq("user_id",userId).eq("project_id",projectId).order("created_at",{ascending:false});if(error)throw error;return data||[];}
  async function addActivity(activity){if(!client)init();const{data,error}=await client.from("crm_activities").insert(activity).select().single();if(error)throw error;return data;}
  async function completeActivity(userId,activityId){if(!client)init();const{data,error}=await client.from("crm_activities").update({completed_at:new Date().toISOString()}).eq("id",activityId).eq("user_id",userId).select().single();if(error)throw error;return data;}
  async function getAlerts(userId){if(!client)init();const{data,error}=await client.from("alerts").select("*").eq("user_id",userId).order("created_at",{ascending:false});if(error)throw error;return data||[];}
  async function saveAlert(userId,name,filters={}){if(!client)init();const{data,error}=await client.from("alerts").insert({user_id:userId,name,filters,is_active:true}).select().single();if(error)throw error;return data;}
  async function updateAlert(userId,alertId,updates={}){if(!client)init();const{data,error}=await client.from("alerts").update(updates).eq("id",alertId).eq("user_id",userId).select().single();if(error)throw error;return data;}
  async function deleteAlert(userId,alertId){if(!client)init();const{error}=await client.from("alerts").delete().eq("id",alertId).eq("user_id",userId);if(error)throw error;}
  async function getMatchingProjects(filters={}){if(!client)init();let query=client.from("projects").select("*",{count:"exact"});if(filters.project_type)query=query.eq("project_type",filters.project_type);if(filters.min_value)query=query.gte("estimated_value",filters.min_value);if(filters.stage)query=query.eq("stage",filters.stage);if(filters.market){const market=filters.market.trim().toLowerCase();if(market==="dfw"||market==="dallas-fort worth")query=query.or("city.ilike.%Dallas%,city.ilike.%Fort Worth%,city.ilike.%Arlington%,city.ilike.%Plano%,city.ilike.%Frisco%,city.ilike.%Irving%,city.ilike.%Garland%,city.ilike.%McKinney%,city.ilike.%Denton%");else query=query.ilike("city",`%${filters.market.split(",")[0].trim()}%`);}const{data,error,count}=await query.order("opportunity_score",{ascending:false});if(error)throw error;return{projects:data||[],count:count??(data?data.length:0)};}
  return {configured,init,getClient,signUp,signIn,signOut,getSession,getProjects,getProjectDocuments,getProjectDocumentCounts,getProjectIntelligence,importProjects,getSavedProjects,saveProject,unsaveProject,getPipeline,removePipelineItem,updatePipeline,getContacts,saveContact,deleteContact,setPrimaryContact,getActivities,addActivity,completeActivity,getAlerts,saveAlert,updateAlert,deleteAlert,getMatchingProjects};
})();
