import { validSession } from "../../_utils/auth.js";
import {
  getFile,
  putFile,
  loadManifest,
  saveManifest
} from "../../_utils/github.js";

const CATS = new Set([
  "pine",
  "planting",
  "care",
  "garden"
]);

const LABELS = {
  pine: "소나무",
  planting: "식재",
  care: "관리",
  garden: "정원·조경"
};

const MAX_BYTES = 8 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function safeName(name) {
  const ext =
    (name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg")
      .toLowerCase();

  const base =
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^0-9A-Za-z가-힣_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "gallery";

  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
}

function parseDataUrl(dataUrl) {
  const m =
    /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(
      dataUrl || ""
    );

  if (!m) {
    throw new Error(
      "JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다."
    );
  }

  const bin = atob(m[2]);

  if (bin.length > MAX_BYTES) {
    throw new Error("사진은 8MB 이하로 올려주세요.");
  }

  return {
    mime: m[1].toLowerCase(),
    b64: m[2]
  };
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_TOKEN) {
    return json(
      {
        ok: false,
        error: "ADMIN_TOKEN이 설정되지 않았습니다."
      },
      500
    );
  }

  if (!(await validSession(request, env.ADMIN_TOKEN))) {
    return json(
      {
        ok: false,
        error: "로그인이 필요합니다."
      },
      401
    );
  }

  try {
    const body = await request.json();

    const title = String(
      body.title || "사진"
    )
      .trim()
      .slice(0, 100);

    const category = String(
      body.category || "garden"
    );

    if (!CATS.has(category)) {
      throw new Error(
        "카테고리가 올바르지 않습니다."
      );
    }

    const {
      b64,
      mime
    } = parseDataUrl(body.dataUrl);

    const originalName = String(
      body.fileName || "gallery.jpg"
    );

    const ext =
      mime.includes("png")
        ? ".png"
        : mime.includes("webp")
        ? ".webp"
        : mime.includes("gif")
        ? ".gif"
        : ".jpg";

    const safeFile = safeName(
      originalName.replace(/\.[^/.]+$/, "") + ext
    );

    const path =
      `images/gallery/${safeFile}`;

    // 1. GitHub에 실제 이미지 저장
    await putFile(
      env,
      path,
      b64,
      `gallery: upload ${safeFile}`
    );

    // 2. gallery.json 읽기
    const manifestFile =
      await getFile(
        env,
        "data/gallery.json"
      );

    const manifest =
      await loadManifest(env);

    if (!Array.isArray(manifest.items)) {
      manifest.items = [];
    }

    const maxOrder =
      manifest.items.reduce(
        (max, item) =>
          Math.max(
            max,
            Number(item.order) || 0
          ),
        0
      );

    const item = {
      id: crypto.randomUUID(),
      title,
      category,
      categoryLabel: LABELS[category],
      src: path,
      managed: true,
      visible: true,
      order: maxOrder + 10
    };

    // 3. gallery.json에 사진 정보 추가
    manifest.items.push(item);

    // 4. GitHub에 gallery.json 저장
    await saveManifest(
      env,
      manifest,
      manifestFile?.sha,
      `gallery: add ${safeFile}`
    );

    return json({
      ok: true,
      path,
      item
    });

  } catch (error) {
    return json(
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
