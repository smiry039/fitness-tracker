import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  safeNext,
  sessionCookieOptions,
} from "@/lib/auth";

// Plain HTML form POST (works without JS, including in a home-screen PWA).
// Success → session cookie + redirect to where you were going.
export async function POST(req: Request) {
  const form = await req.formData();
  const user = String(form.get("user") ?? "");
  const pass = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));

  // 303 so the browser follows with a GET.
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);

  if (!checkCredentials(user, pass)) {
    // Slow down guessing a little; this is a one-person app.
    await new Promise((r) => setTimeout(r, 800));
    return to(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const res = to(next);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return res;
}
