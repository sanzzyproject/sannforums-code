export function requireAdmin(req) {
  const adminKey = req.headers["x-admin-key"] || req.query.adminKey;
  
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    throw new Error("Unauthorized: Invalid admin key");
  }
  
  return true;
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  };
}
