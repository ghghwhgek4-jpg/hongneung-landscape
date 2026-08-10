import {requireAdmin,json} from "../../../_auth.js";
export async function onRequestPost({request,env,params}) {
  const denied=requireAdmin(request,env); if(denied)return denied;
  if(!env.DB)return json({error:"D1 binding DB is not configured"},503);
  await env.DB.prepare("UPDATE gallery SET published=CASE WHEN published=1 THEN 0 ELSE 1 END WHERE id=?").bind(params.id).run();
  return json({ok:true});
}
