// Session cookie for the single-user gate. Stateless: the cookie holds an
// expiry and an HMAC of it, keyed from the app password (or AUTH_SECRET), so
// changing the password logs every device out. Web Crypto only — this runs in
// the Edge middleware as well as in route handlers.

export const SESSION_COOKIE = "ft_session";
// Browsers cap cookie lifetime at ~400 days. The middleware re-issues the
// cookie once it's past half-life, so a device you actually use never expires.
export const SESSION_TTL_S = 400 * 24 * 60 * 60;
export const SESSION_RENEW_AFTER_S = SESSION_TTL_S / 2;

export function authEnabled(): boolean {
  return !!process.env.APP_PASSWORD;
}

function secret(): string {
  return process.env.AUTH_SECRET || `${process.env.APP_USER ?? ""}:${process.env.APP_PASSWORD ?? ""}`;
}

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

// Constant-time-ish string comparison to avoid trivial timing leaks.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(nowS = Math.floor(Date.now() / 1000)): Promise<string> {
  const exp = nowS + SESSION_TTL_S;
  return `${exp}.${await hmac(`session:${exp}`)}`;
}

/** Seconds until expiry if the token is valid, otherwise null. */
export async function verifySessionToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const exp = Number(token.slice(0, dot));
  if (!Number.isInteger(exp)) return null;
  const left = exp - Math.floor(Date.now() / 1000);
  if (left <= 0) return null;
  const expected = await hmac(`session:${exp}`);
  return safeEqual(token.slice(dot + 1), expected) ? left : null;
}

export function checkCredentials(user: string, pass: string): boolean {
  const expectedUser = process.env.APP_USER || "viking";
  const password = process.env.APP_PASSWORD ?? "";
  // Evaluate both so a wrong username isn't faster than a wrong password.
  const userOk = safeEqual(user.trim().toLowerCase(), expectedUser.toLowerCase());
  const passOk = safeEqual(pass, password);
  return userOk && passOk;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
};

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
