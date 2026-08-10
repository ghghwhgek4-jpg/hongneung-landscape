import { json } from "./_auth.js";
export async function onRequestGet({env}) {
  if (!env.DB || !env.MEDIA) return json({items:[]});
  const {results=[]} = await env.DB.prepare(
    "SELECT id,key,title,alt,category,sort_order,published FROM gallery WHERE published=1 ORDER BY sort_order ASC,id DESC"
  ).all();
  return json({items:results.map(x=>({...x,url:"/api/image/"+encodeURIComponent(x.key)}))});
}
