import { validSession } from "../../../_utils/auth.js";
import { getFile, putFile, loadManifest, saveManifest, repoConfig } from "../../../_utils/github.js";

const CATS = new Set(["pine","planting","care","garden"]);
const LABELS = {pine:"소나무",planting:"식재",care:"관리",garden:"정원·조경"};
const MAX_BYTES = 8 * 1024 * 1024;

function safeName(name) {
  const ext = (name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg").toLowerCase();
  const base = name.replace(/\.[^/.]+$/,'').replace(/[^0-9A-Za-z가-힣_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || "gallery";
  return `${Date.now()}-${crypto.randomUUID().slice(0,8)}-${base}${ext}`;
}
function parseDataUrl(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(dataUrl || "");
  if (!m) throw new Error("JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.");
  const bin = atob(m[2]);
  if (bin.length > MAX_BYTES) throw new Error("사진은 8MB 이하로 올려주세요.");
  return {mime:m[1].toLowerCase(), b64:m[2]};
}

export async function onRequestPost({ request, env }) {
  if (!(await validSession(request, env.ADMIN_TOKEN))) return Response.json({ok:false,error:"로그인이 필요합니다."},{status:401});
  try {
    const body = await request.json();
    const title = String(body.title || "사진").trim().slice(0,100);
    const category = String(body.category || "garden");
    if (!CATS.has(category)) throw new Error("카테고리가 올바르지 않습니다.");
    const { b64, mime } = parseDataUrl(body.dataUrl);
    const originalName = String(body.fileName || "gallery.jpg");
    const ext = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : mime.includes("gif") ? ".gif" : ".jpg";
    const safeFile = safeName(originalName.replace(/\.[^/.]+$/,"")+ext);
    const path = `images/gallery/${safeFile}`;
    await putFile(env, path, b64, `gallery: upload ${safeFile}`);

    const manifestFile = await getFile(env, "data/gallery.json");
    const manifest = await loadManifest(env);
    const maxOrder = manifest.items.reduce((m,x)=>Math.max(m,Number(x.order)||0),0);
    manifest.items.push({id:crypto.randomUUID(),title,category,categoryLabel:LABELS[category],src:path,managed:true,visible:true,order:maxOrder+10});
    const sha = manifestFile?.sha;
    await saveManifest(env, manifest, sha, `gallery: add ${safeFile}`);
    return Response.json({ok:true,path,item:manifest.items.at(-1)});
  } catch(e) { return Response.json({ok:false,error:e.message||"업로드에 실패했습니다."},{status:400}); }
}
