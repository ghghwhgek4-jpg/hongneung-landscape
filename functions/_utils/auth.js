const COOKIE = "__Host-hn_admin";
const MAX_AGE = 60 * 60 * 8;

function toB64Url(bytes) {
  let s=""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function fromB64Url(s) { return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/") + "==="), c=>c.charCodeAt(0)); }

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign","verify"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function makeSession(secret) {
  const ts = Math.floor(Date.now()/1000);
  const payload = `${ts}`;
  const sig = toB64Url(await hmac(secret,payload));
  return `${payload}.${sig}`;
}

export async function validSession(request, secret) {
  if (!secret) return false;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}=([^;]+)`));
  if (!match) return false;
  const [tsText,sigText] = match[1].split(".");
  const ts = Number(tsText);
  if (!Number.isFinite(ts) || Math.floor(Date.now()/1000)-ts > MAX_AGE || ts > Math.floor(Date.now()/1000)+60) return false;
  const expected = await hmac(secret, tsText);
  let given;
  try { given = fromB64Url(sigText); } catch { return false; }
  if (given.length !== expected.length) return false;
  let diff=0; for(let i=0;i<given.length;i++) diff |= given[i]^expected[i];
  return diff===0;
}

export function sessionCookie(value) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearCookie() { return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
