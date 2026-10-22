import { getSupabaseConfig } from "./_lib/supabase-rest.js";

async function authenticate(req) {
  const header = String(req.headers?.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

async function supabase(req, table, options = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(options.query || {})) endpoint.searchParams.set(key, value);
  const response = await fetch(endpoint, {
    method: options.method || "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!response.ok) throw new Error(typeof data === "string" ? data : (data?.message || JSON.stringify(data)));
  return data;
}

export default async function handler(req, res) {
  try {
    const user = await authenticate(req);
    if (!user?.id) return res.status(401).json({ error: "unauthorized" });

    const type = String(req.query?.type || req.body?.type || "");
    if (!["saved", "pipeline"].includes(type)) return res.status(400).json({ error: "invalid_state_type" });

    const table = type === "saved" ? "saved_projects" : "pipeline_items";
    const projectId = req.body?.projectId == null ? null : String(req.body.projectId);
    const action = String(req.body?.action || "list");

    if (req.method === "GET" || action === "list") {
      const rows = await supabase(req, table, {
        query: { select: "*", user_id: `eq.${user.id}`, order: "updated_at.desc.nullslast,created_at.desc.nullslast" }
      });
      return res.status(200).json({ data: rows || [] });
    }

    if (!projectId) return res.status(400).json({ error: "project_id_required" });

    if (type === "saved") {
      if (action === "save") {
        const rows = await supabase(req, table, {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=representation",
          body: [{ user_id: user.id, project_id: projectId }]
        });
        return res.status(200).json({ data: rows });
      }
      if (action === "remove") {
        await supabase(req, table, {
          method: "DELETE",
          query: { user_id: `eq.${user.id}`, project_id: `eq.${projectId}` }
        });
        return res.status(200).json({ ok: true });
      }
    }

    if (type === "pipeline") {
      if (action === "remove") {
        await supabase(req, table, {
          method: "DELETE",
          query: { user_id: `eq.${user.id}`, project_id: `eq.${projectId}` }
        });
        return res.status(200).json({ ok: true });
      }
      if (action === "upsert") {
        const row = {
          user_id: user.id,
          project_id: projectId,
          stage: req.body?.stage || "new",
          updated_at: new Date().toISOString()
        };
        for (const key of ["notes","follow_up_at","opportunity_value","probability","expected_close_date","next_action","lost_reason"]) {
          if (req.body?.[key] !== undefined) row[key] = req.body[key] || null;
        }
        const rows = await supabase(req, table, {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=representation",
          body: [row]
        });
        return res.status(200).json({ data: rows });
      }
    }

    return res.status(400).json({ error: "unsupported_action" });
  } catch (error) {
    console.error("User state API failed", error);
    return res.status(500).json({ error: "user_state_failed", message: error?.message || String(error) });
  }
}
