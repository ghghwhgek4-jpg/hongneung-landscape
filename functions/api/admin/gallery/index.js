import {requireAdmin,json} from "../../_auth.js";
export async function onRequestGet({request,env}) {
  const denied=requireAdmin(request,env); if(denied)return denied;
  if(!env.DB)return json({error:"D1 binding DB is not configured"},503);
  const {results=[]}=await env.DB.prepare(
    "SELECT id,key,title,alt,category,sort_order,published,created_at FROM gallery ORDER BY sort_order ASC,id DESC"
  ).all();
  return json({items:results.map(x=>({...x,url:"/api/image/"+encodeURIComponent(x.key)}))});
}
