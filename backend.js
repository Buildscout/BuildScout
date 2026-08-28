window.BuildScoutBackend = (() => {
  let client = null;

  function configured() { const c = window.BUILDSCOUT_CONFIG || {}; return Boolean(c.supabaseUrl && c.supabasePublishableKey); }
  function init() { if (client) return client; if (!configured()) throw new Error("Supabase configuration is missing."); client = window.supabase.createClient(window.BUILDSCOUT_CONFIG.supabaseUrl, window.BUILDSCOUT_CONFIG.supabasePublishableKey); return client; }
  function getClient() { return client; }
  async function signUp(email,password,firstName="",lastName="") { if(!client)init(); const {data,error}=await client.auth.signUp({email,password,options:{data:{first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`.trim()}}}); if(error)throw error; return data; }
  async function signIn(email,password){if(!client)init();const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data;}
  async function signOut(){if(!client)return;const{error}=await client.auth.signOut();if(error)throw error;}
  async function getSession(){if(!client)init();const{data,error}=await client.auth.getSession();if(error)throw error;return data.session;}
  async function getProjects(){if(!client)init();const{data,error}=await client.from("projects").select("*").order("created_at",{ascending:false});if(error)throw error;return data||[];}
  async function getProjectDocuments(projectId){if(!client)init();const{data,error}=await client.from("project_documents").select("*").eq("project_id",projectId).eq("is_public",true).order("document_type",{ascending:true}).order("sheet_number",{ascending:true});if(error)throw error;return data||[];}
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
  async function getSavedProjects(userId){if(!client)init();const{data,error}=await client.from("saved_projects").select("project_id").eq("user_id",userId);if(error)throw error;return data||[];}
  async function saveProject(userId,projectId){if(!client)init();const{data,error}=await client.from("saved_projects").upsert({user_id:userId,project_id:projectId});if(error)throw error;return data;}
  async function unsaveProject(userId,projectId){if(!client)init();const{error}=await client.from("saved_projects").delete().eq("user_id",userId).eq("project_id",projectId);if(error)throw error;}
  async function getPipeline(userId){if(!client)init();const{data,error}=await client.from("pipeline_items").select("*").eq("user_id",userId);if(error)throw error;return data||[];}
  async function updatePipeline(userId,projectId,stage,notes=undefined,followUpAt=undefined,crm={}){if(!client)init();const updates={user_id:userId,project_id:projectId,stage,updated_at:new Date().toISOString()};if(notes!==undefined)updates.notes=notes;if(followUpAt!==undefined)updates.follow_up_at=followUpAt||null;["opportunity_value","probability","expected_close_date","next_action","lost_reason"].forEach(k=>{if(crm[k]!==undefined)updates[k]=crm[k]||null;});const{data,error}=await client.from("pipeline_items").upsert(updates).select();if(error)throw error;return data;}
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
  return {configured,init,getClient,signUp,signIn,signOut,getSession,getProjects,getProjectDocuments,importProjects,getSavedProjects,saveProject,unsaveProject,getPipeline,updatePipeline,getContacts,saveContact,deleteContact,setPrimaryContact,getActivities,addActivity,completeActivity,getAlerts,saveAlert,updateAlert,deleteAlert,getMatchingProjects};
})();
