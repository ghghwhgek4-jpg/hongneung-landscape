import { loadManifest } from "../_utils/github.js";
export async function onRequestGet({ env }) {
  try {
    const manifest = await loadManifest(env);
    const items = (manifest.items || []).filter(x => x.visible !== false).sort((a,b)=>(a.order||0)-(b.order||0));
    return Response.json({ok:true,items},{headers:{"Cache-Control":"no-store"}});
  } catch (e) {
    return Response.json({ok:false,error:"갤러리 정보를 불러오지 못했습니다."},{status:500});
  }
}
