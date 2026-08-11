function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")
  );

  return match ? decodeURIComponent(match[1]) : "";
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) {
    return json({
      error: "ADMIN_TOKEN이 설정되지 않았습니다."
    }, 500);
  }

  // 로그인 후 생성된 세션 쿠키 확인
  const session = getCookie(request, "admin_session");

  if (session && session === env.ADMIN_TOKEN) {
    return null;
  }

  // 기존 Bearer 인증도 허용
  const auth = request.headers.get("Authorization") || "";

  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);

    if (token === env.ADMIN_TOKEN) {
      return null;
    }
  }

  return json({
    error: "Unauthorized"
  }, 401);
}

export { requireAdmin, json };
