function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({error:"Unauthorized"}), {
      status:401, headers:{"content-type":"application/json"}
    });
  }
  return null;
}
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
