import { validSession } from "../../_utils/auth.js";
import {
  getFile,
  deleteFile,
  loadManifest,
  saveManifest
} from "../../_utils/github.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
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
    const id = String(body.id || "").trim();

    if (!id) {
      throw new Error("삭제할 사진 ID가 없습니다.");
    }

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

    const item =
      manifest.items.find(
        x => x.id === id
      );

    if (!item) {
      throw new Error(
        "사진을 찾을 수 없습니다."
      );
    }

    // gallery.json에서 먼저 제거
    manifest.items =
      manifest.items.filter(
        x => x.id !== id
      );

    await saveManifest(
      env,
      manifest,
      manifestFile?.sha,
      `gallery: remove ${item.title || id}`
    );

    // 관리자가 업로드한 이미지라면
    // GitHub 실제 파일도 삭제
    if (
      item.managed &&
      typeof item.src === "string" &&
      item.src.startsWith(
        "images/gallery/"
      )
    ) {
      const file =
        await getFile(
          env,
          item.src
        );

      if (file?.sha) {
        await deleteFile(
          env,
          item.src,
          file.sha,
          `gallery: delete ${item.src}`
        );
      }
    }

    return json({
      ok: true
    });

  } catch (error) {
    return json(
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
