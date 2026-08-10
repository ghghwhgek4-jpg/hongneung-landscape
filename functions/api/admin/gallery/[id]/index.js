import {requireAdmin,json} from "../../../_auth.js";
export async function onRequestDelete({request,env,params}) {
  const denied=requireAdmin(request,env); if(denied)return denied;
  if(!env.DB||!env.MEDIA)return json({error:"D1/R2 binding not configured"},503);
  const row=await env.DB.prepare("SELECT key FROM gallery WHERE id=?").bind(params.id).first();
  if(!row)return json({error:"Not found"},404);
  await env.MEDIA.delete(row.key);
  await env.DB.prepare("DELETE FROM gallery WHERE id=?").bind(params.id).run();
  return json({ok:true});
}
