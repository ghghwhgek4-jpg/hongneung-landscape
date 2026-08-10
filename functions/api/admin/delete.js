import { validSession } from "../../_utils/auth.js";
import { getFile, deleteFile, loadManifest, saveManifest } from "../../_utils/github.js";

export async function onRequestPost({ request, env }) {
  if (!(await validSession(request, env.ADMIN_TOKEN))) return Response.json({ok:false,error:"로그인이 필요합니다."},{status:401});
  try {
    const { id } = await request.json();
    const manifestFile = await getFile(env,"data/gallery.json");
    const manifest = await loadManifest(env);
    const item = manifest.items.find(x=>x.id===id);
    if (!item) throw new Error("사진을 찾을 수 없습니다.");
    manifest.items = manifest.items.filter(x=>x.id!==id);
    await saveManifest(env, manifest, manifestFile?.sha, `gallery: remove ${item.title||id}`);
    if (item.managed && item.src?.startsWith("images/gallery/")) {
      const file = await getFile(env,item.src);
      if (file?.sha) await deleteFile(env,item.src,file.sha,`gallery: delete ${item.src}`);
    }
    return Response.json({ok:true});
  } catch(e) { return Response.json({ok:false,error:e.message||"삭제에 실패했습니다."},{status:400}); }
}
