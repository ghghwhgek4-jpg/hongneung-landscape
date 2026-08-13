import {
  makeSession,
  sessionCookie,
  clearCookie,
  validSession
} from "../../_utils/auth.js";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

export async function onRequestGet({ request, env }) {
  return json({
    ok: await validSession(request, env.ADMIN_TOKEN),
    configured: !!env.ADMIN_TOKEN
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (!env.ADMIN_TOKEN) {
      return json({
        ok: false,
        configured: false,
        error: "ADMIN_TOKEN이 설정되지 않았습니다."
      }, 500);
    }

    if (typeof password !== "string") {
      return json({
        ok: false,
        error: "비밀번호 형식이 올바르지 않습니다."
      }, 400);
    }

    if (password !== env.ADMIN_TOKEN) {
      return json({
        ok: false,
        configured: true,
        error: "인증에 실패했습니다. Cloudflare ADMIN_TOKEN을 확인하세요."
      }, 401);
    }

    const session = await makeSession(env.ADMIN_TOKEN);

    return json(
      {
        ok: true,
        configured: true
      },
      200,
      {
        "Set-Cookie": sessionCookie(session)
      }
    );

  } catch (e) {
    return json({
      ok: false,
      error: e?.message || "로그인 요청이 올바르지 않습니다."
    }, 400);
  }
}

export async function onRequestDelete() {
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": clearCookie()
    }
  );
}
