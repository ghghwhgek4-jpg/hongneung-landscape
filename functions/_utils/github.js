const API = "https://api.github.com";

function envValue(env, key, fallback = "") { return env[key] || fallback; }

export function repoConfig(env) {
  return {
    owner: envValue(env, "GITHUB_OWNER", "ghghwhgek4-jpg"),
    repo: envValue(env, "GITHUB_REPO", "hongneung-landscape"),
    branch: envValue(env, "GITHUB_BRANCH", "main"),
    token: env.GITHUB_TOKEN || ""
  };
}

export async function githubRequest(env, path, options = {}) {
  const { token } = repoConfig(env);
  if (!token) throw new Error("GITHUB_TOKEN secret is not configured.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "Hongneung-Landscape-Admin");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API}${path}`, { ...options, headers });
}

export function repoPath(env, filePath) {
  const { owner, repo } = repoConfig(env);
  return `/repos/${owner}/${repo}/contents/${filePath}`;
}

export async function getFile(env, filePath) {
  const { branch } = repoConfig(env);
  const res = await githubRequest(env, `${repoPath(env,filePath)}?ref=${encodeURIComponent(branch)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  return res.json();
}

export async function putFile(env, filePath, contentBase64, message, sha = undefined) {
  const { branch } = repoConfig(env);
  const body = { message, content: contentBase64, branch };
  if (sha) body.sha = sha;
  const res = await githubRequest(env, repoPath(env,filePath), { method:"PUT", body:JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${text.slice(0,300)}`);
  }
  return res.json();
}

export async function deleteFile(env, filePath, sha, message) {
  const { branch } = repoConfig(env);
  const res = await githubRequest(env, repoPath(env,filePath), { method:"DELETE", body:JSON.stringify({message,sha,branch}) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub delete failed: ${res.status} ${text.slice(0,300)}`);
  }
  return res.json();
}

export function b64utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}

export function decodeBase64Utf8(b64) {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function loadManifest(env) {
  const file = await getFile(env, "data/gallery.json");
  if (!file) return { version:1, items:[] };
  return JSON.parse(decodeBase64Utf8(file.content.replace(/\n/g,"")));
}

export async function saveManifest(env, manifest, sha, message) {
  return putFile(env, "data/gallery.json", b64utf8(JSON.stringify(manifest,null,2)+"\n"), message, sha);
}
