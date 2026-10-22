import { getSupabaseConfig } from "./_lib/supabase-rest.js";

async function authenticate(req) {
  const header = String(req.headers?.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  return response.json();
}

function intParam(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(Math.floor(n), max));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  res.setHeader("Cache-Control", "private, no-store");

  try {
    const user = await authenticate(req);
    if (!user?.id) return res.status(401).json({ error: "unauthorized" });

    const { url, serviceRoleKey } = getSupabaseConfig();
    const limit = intParam(req.query?.limit, 1000, 1, 1000);
    const offset = intParam(req.query?.offset, 0, 0, 1000000);

    const endpoint = new URL(`${url}/rest/v1/projects`);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("order", "created_at.desc");
    endpoint.searchParams.set("limit", String(limit));
    endpoint.searchParams.set("offset", String(offset));

    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact"
      }
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({
        error: "projects_query_failed",
        message: body.slice(0, 1000)
      });
    }

    const data = await response.json();
    const contentRange = response.headers.get("content-range") || "";
    const match = contentRange.match(/\/(\d+)$/);
    const total = match ? Number(match[1]) : null;

    return res.status(200).json({
      data,
      total,
      offset,
      limit,
      userId: user.id
    });
  } catch (error) {
    console.error("Projects API failed", error);
    return res.status(500).json({
      error: "projects_api_failed",
      message: error?.message || String(error)
    });
  }
}
