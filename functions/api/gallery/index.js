import { loadManifest } from "../../_utils/github.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequestGet({ env }) {
  try {
    const manifest = await loadManifest(env);

    const items = (manifest.items || [])
      .filter(item => item.visible !== false)
      .sort(
        (a, b) =>
          (Number(a.order) || 0) -
          (Number(b.order) || 0)
      );

    return json({
      ok: true,
      items
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error?.message ||
          "갤러리 정보를 불러오지 못했습니다."
      },
      500
    );
  }
}
