import {requireAdmin,json} from "../_auth.js";
export async function onRequestPost({request,env}) {
  const denied=requireAdmin(request,env); if(denied)return denied;
  if(!env.DB||!env.MEDIA)return json({error:"D1/R2 binding not configured"},503);
  const form=await request.formData();
  const files=form.getAll("files").filter(x=>x && typeof x.arrayBuffer==="function");
  const category=String(form.get("category")||"pine");
  const title=String(form.get("title")||"");
  const published=String(form.get("published")||"0")==="1"?1:0;
  const allowed=new Set(["pine","planting","care","garden"]);
  if(!allowed.has(category))return json({error:"Invalid category"},400);
  if(!files.length)return json({error:"No files"},400);
  const {results:sortRows=[]}=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS maxOrder FROM gallery").all();
  let sort=Number(sortRows[0]?.maxOrder||0);
  let count=0;
  for(const file of files){
    const type=file.type||"";
    if(!["image/jpeg","image/png","image/webp"].includes(type))continue;
    if(file.size>15*1024*1024)continue;
    const ext=type==="image/png"?"png":type==="image/webp"?"webp":"jpg";
    const key=`gallery/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:type}});
    const safeTitle=title || file.name.replace(/\.[^.]+$/,"");
    await env.DB.prepare(
      "INSERT INTO gallery (key,title,alt,category,sort_order,published,created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
    ).bind(key,safeTitle,safeTitle,category,++sort,published).run();
    count++;
  }
  return json({ok:true,count});
}
