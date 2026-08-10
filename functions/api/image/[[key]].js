export async function onRequestGet({params, env}) {
  if (!env.MEDIA) return new Response("R2 binding MEDIA is not configured.",{status:503});
  const key = decodeURIComponent(params.key || "");
  if (!key) return new Response("Not Found",{status:404});
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not Found",{status:404});
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control","public,max-age=31536000,immutable");
  return new Response(object.body,{headers});
}
