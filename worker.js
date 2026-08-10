import { makeSession, sessionCookie, clearCookie, validSession } from "./functions/_utils/auth.js";
import { getFile, putFile, deleteFile, loadManifest, saveManifest } from "./functions/_utils/github.js";

const CATS=new Set(["pine","planting","care","garden"]);
const LABELS={pine:"소나무",planting:"식재",care:"관리",garden:"정원·조경"};
const MAX=8*1024*1024;
const J=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...h}});
const safe=n=>{const e=(n.match(/\.[a-zA-Z0-9]+$/)?.[0]||".jpg").toLowerCase();const b=n.replace(/\.[^/.]+$/,"").replace(/[^0-9A-Za-z가-힣_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"gallery";return `${Date.now()}-${crypto.randomUUID().slice(0,8)}-${b}${e}`};
function dataURL(s){const m=/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(s||"");if(!m)throw Error("JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.");const b=atob(m[2]);if(b.length>MAX)throw Error("사진은 8MB 이하로 올려주세요.");return{mime:m[1].toLowerCase(),b64:m[2]};}

async function api(r,e,u){
 const p=u.pathname;
 if(p==="/api/admin/login"){
  if(r.method==="GET")return J({ok:await validSession(r,e.ADMIN_TOKEN)});
  if(r.method==="DELETE")return J({ok:true},200,{"Set-Cookie":clearCookie()});
  if(r.method==="POST"){try{const {password}=await r.json();if(!e.ADMIN_TOKEN||typeof password!=="string"||password!==e.ADMIN_TOKEN)return J({ok:false,error:"관리자 인증에 실패했습니다."},401);return J({ok:true},200,{"Set-Cookie":sessionCookie(await makeSession(e.ADMIN_TOKEN))});}catch{return J({ok:false,error:"로그인 요청이 올바르지 않습니다."},400)}}
 }
 if(p==="/api/gallery"&&r.method==="GET"){try{const m=await loadManifest(e);return J({ok:true,items:(m.items||[]).filter(x=>x.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0))});}catch{return J({ok:false,error:"갤러리 정보를 불러오지 못했습니다."},500)}}
 if(p==="/api/admin/upload"&&r.method==="POST"){
  if(!await validSession(r,e.ADMIN_TOKEN))return J({ok:false,error:"로그인이 필요합니다."},401);
  try{const b=await r.json(),title=String(b.title||"사진").trim().slice(0,100),cat=String(b.category||"garden");if(!CATS.has(cat))throw Error("카테고리가 올바르지 않습니다.");const {b64,mime}=dataURL(b.dataUrl),orig=String(b.fileName||"gallery.jpg"),ext=mime.includes("png")?".png":mime.includes("webp")?".webp":mime.includes("gif")?".gif":".jpg",file=safe(orig.replace(/\.[^/.]+$/,"")+ext),path="images/gallery/"+file;await putFile(e,path,b64,"gallery: upload "+file);const mf=await getFile(e,"data/gallery.json"),m=await loadManifest(e),order=(m.items||[]).reduce((x,y)=>Math.max(x,Number(y.order)||0),0)+10,item={id:crypto.randomUUID(),title,category:cat,categoryLabel:LABELS[cat],src:path,managed:true,visible:true,order};m.items.push(item);await saveManifest(e,m,mf?.sha,"gallery: add "+file);return J({ok:true,item});}catch(x){return J({ok:false,error:x.message||"업로드에 실패했습니다."},400)}
 }
 if(p==="/api/admin/delete"&&r.method==="POST"){
  if(!await validSession(r,e.ADMIN_TOKEN))return J({ok:false,error:"로그인이 필요합니다."},401);
  try{const {id}=await r.json(),mf=await getFile(e,"data/gallery.json"),m=await loadManifest(e),item=(m.items||[]).find(x=>x.id===id);if(!item)throw Error("사진을 찾을 수 없습니다.");m.items=m.items.filter(x=>x.id!==id);await saveManifest(e,m,mf?.sha,"gallery: remove "+(item.title||id));if(item.managed&&item.src?.startsWith("images/gallery/")){const f=await getFile(e,item.src);if(f?.sha)await deleteFile(e,item.src,f.sha,"gallery: delete "+item.src)}return J({ok:true});}catch(x){return J({ok:false,error:x.message||"삭제에 실패했습니다."},400)}
 }
 return J({ok:false,error:"Not Found"},404);
}
export default{async fetch(r,e){const u=new URL(r.url);return u.pathname.startsWith("/api/")?api(r,e,u):e.ASSETS.fetch(r)}};
