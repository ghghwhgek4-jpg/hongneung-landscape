import { makeSession, sessionCookie, clearCookie, validSession } from "../../_utils/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    if (!env.ADMIN_TOKEN || typeof password !== "string" || password !== env.ADMIN_TOKEN) {
      return Response.json({ok:false,error:"관리자 인증에 실패했습니다."},{status:401});
    }
    const session = await makeSession(env.ADMIN_TOKEN);
    return new Response(JSON.stringify({ok:true}), {status:200, headers:{"Content-Type":"application/json","Set-Cookie":sessionCookie(session)}});
  } catch (e) { return Response.json({ok:false,error:"로그인 요청이 올바르지 않습니다."},{status:400}); }
}

export async function onRequestGet({ request, env }) {
  return Response.json({ok:await validSession(request, env.ADMIN_TOKEN)});
}

export async function onRequestDelete() {
  return new Response(JSON.stringify({ok:true}), {status:200, headers:{"Content-Type":"application/json","Set-Cookie":clearCookie()}});
}
