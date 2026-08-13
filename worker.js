import { makeSession, sessionCookie, clearCookie, validSession } from "./functions/_utils/auth.js";
import { getFile, putFile, deleteFile, loadManifest, saveManifest } from "./functions/_utils/github.js";

const CATS = new Set(["pine", "planting", "care", "garden"]);

const LABELS = {
  pine: "소나무",
  planting: "식재",
  care: "관리",
  garden: "정원·조경"
};

const MAX = 8 * 1024 * 1024;

function J(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function safeName(name) {
  const match = name.match(/\.[a-zA-Z0-9]+$/);
  const ext = (match?.[0] || ".jpg").toLowerCase();

  const base = name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^0-9A-Za-z가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "gallery";

  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(
    dataUrl || ""
  );

  if (!match) {
    throw new Error("JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.");
  }

  const binary = atob(match[2]);

  if (binary.length > MAX) {
    throw new Error("사진은 8MB 이하로 올려주세요.");
  }

  return {
    mime: match[1].toLowerCase(),
    b64: match[2]
  };
}

async function api(request, env, url) {
  const path = url.pathname;

  // 관리자 로그인
  if (path === "/api/admin/login") {
    if (request.method === "GET") {
      return J({
        ok: await validSession(request, env.ADMIN_TOKEN),
        configured: !!env.ADMIN_TOKEN
      });
    }

    if (request.method === "DELETE") {
      return J(
        { ok: true },
        200,
        {
          "Set-Cookie": clearCookie()
        }
      );
    }

    if (request.method === "POST") {
      try {
        const { password } = await request.json();

        if (!env.ADMIN_TOKEN) {
          return J(
            {
              ok: false,
              error: "ADMIN_TOKEN이 Worker Runtime에 없습니다."
            },
            500
          );
        }

        if (typeof password !== "string") {
          return J(
            {
              ok: false,
              error: "비밀번호 형식이 올바르지 않습니다."
            },
            400
          );
        }

        if (password !== env.ADMIN_TOKEN) {
          return J(
            {
              ok: false,
              error: "ADMIN_TOKEN 값과 입력한 비밀번호가 일치하지 않습니다."
            },
            401
          );
        }

        const session = await makeSession(env.ADMIN_TOKEN);

        return J(
          { ok: true },
          200,
          {
            "Set-Cookie": sessionCookie(session)
          }
        );
      } catch (error) {
        return J(
          {
            ok: false,
            error: "로그인 요청 처리 중 오류가 발생했습니다."
          },
          400
        );
      }
    }

    return J(
      {
        ok: false,
        error: "지원하지 않는 요청입니다."
      },
      405
    );
  }

  // 일반 갤러리 조회
  if (path === "/api/gallery" && request.method === "GET") {
    try {
      const manifest = await loadManifest(env);

      const items = (manifest.items || [])
        .filter(item => item.visible !== false)
        .sort(
          (a, b) =>
            (Number(a.order) || 0) -
            (Number(b.order) || 0)
        );

      return J({
        ok: true,
        items
      });
    } catch (error) {
      return J(
        {
          ok: false,
          error: "갤러리 정보를 불러오지 못했습니다."
        },
        500
      );
    }
  }

  // 관리자 갤러리 조회
  // /api/admin/gallery?all=1
  if (path === "/api/admin/gallery" && request.method === "GET") {
    if (!(await validSession(request, env.ADMIN_TOKEN))) {
      return J(
        {
          ok: false,
          error: "로그인이 필요합니다."
        },
        401
      );
    }

    try {
      const manifest = await loadManifest(env);

      const items = (manifest.items || [])
        .slice()
        .sort(
          (a, b) =>
            (Number(a.order) || 0) -
            (Number(b.order) || 0)
        );

      return J({
        ok: true,
        items
      });
    } catch (error) {
      return J(
        {
          ok: false,
          error:
            error?.message ||
            "관리자 갤러리 정보를 불러오지 못했습니다."
        },
        500
      );
    }
  }

  // 관리자 사진 업로드
  if (path === "/api/admin/upload" && request.method === "POST") {
    if (!(await validSession(request, env.ADMIN_TOKEN))) {
      return J(
        {
          ok: false,
          error: "로그인이 필요합니다."
        },
        401
      );
    }

    try {
      const body = await request.json();

      const title = String(body.title || "사진")
        .trim()
        .slice(0, 100);

      const category = String(body.category || "garden");

      if (!CATS.has(category)) {
        throw new Error("카테고리가 올바르지 않습니다.");
      }

      const parsed = parseDataUrl(body.dataUrl);

      const originalName = String(
        body.fileName || "gallery.jpg"
      );

      let extension = ".jpg";

      if (parsed.mime.includes("png")) {
        extension = ".png";
      } else if (parsed.mime.includes("webp")) {
        extension = ".webp";
      } else if (parsed.mime.includes("gif")) {
        extension = ".gif";
      }

      const fileName = safeName(
        originalName.replace(/\.[^/.]+$/, "") + extension
      );

      const filePath = `images/gallery/${fileName}`;

      await putFile(
        env,
        filePath,
        parsed.b64,
        `gallery: upload ${fileName}`
      );

      const manifestFile = await getFile(
        env,
        "data/gallery.json"
      );

      const manifest = await loadManifest(env);

      const maxOrder = (manifest.items || []).reduce(
        (max, item) =>
          Math.max(max, Number(item.order) || 0),
        0
      );

      const item = {
        id: crypto.randomUUID(),
        title,
        category,
        categoryLabel: LABELS[category],
        src: filePath,
        managed: true,
        visible: true,
        order: maxOrder + 10
      };

      manifest.items.push(item);

      await saveManifest(
        env,
        manifest,
        manifestFile?.sha,
        `gallery: add ${fileName}`
      );

      return J({
        ok: true,
        item
      });
    } catch (error) {
      return J(
        {
          ok: false,
          error:
            error?.message ||
            "업로드에 실패했습니다."
        },
        400
      );
    }
  }

  // 관리자 사진 삭제
  if (path === "/api/admin/delete" && request.method === "POST") {
    if (!(await validSession(request, env.ADMIN_TOKEN))) {
      return J(
        {
          ok: false,
          error: "로그인이 필요합니다."
        },
        401
      );
    }

    try {
      const { id } = await request.json();

      const manifestFile = await getFile(
        env,
        "data/gallery.json"
      );

      const manifest = await loadManifest(env);

      const item = (manifest.items || []).find(
        galleryItem => galleryItem.id === id
      );

      if (!item) {
        throw new Error("사진을 찾을 수 없습니다.");
      }

      manifest.items = manifest.items.filter(
        galleryItem => galleryItem.id !== id
      );

      await saveManifest(
        env,
        manifest,
        manifestFile?.sha,
        `gallery: remove ${item.title || id}`
      );

      if (
        item.managed &&
        item.src?.startsWith("images/gallery/")
      ) {
        const file = await getFile(env, item.src);

        if (file?.sha) {
          await deleteFile(
            env,
            item.src,
            file.sha,
            `gallery: delete ${item.src}`
          );
        }
      }

      return J({
        ok: true
      });
    } catch (error) {
      return J(
        {
          ok: false,
          error:
            error?.message ||
            "삭제에 실패했습니다."
        },
        400
      );
    }
  }

  return J(
    {
      ok: false,
      error: "Not Found"
    },
    404
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return api(request, env, url);
    }

    // redeploy
    return env.ASSETS.fetch(request);
  }
};
