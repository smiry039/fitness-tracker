import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_S,
  authEnabled,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth";

// Optional gate for hosted deployments.
//
// Single-user app, no accounts. Set APP_PASSWORD (and optionally APP_USER) in
// the host's environment and every page and API route requires a session
// cookie, obtained once via the /login form. Unlike HTTP Basic Auth this works
// inside a home-screen PWA (which can't show the Basic Auth prompt) and the
// session lasts ~400 days, renewed automatically while you keep using it.
// Leave APP_PASSWORD unset for local development (no login).

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const left = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (left !== null) {
    const res = NextResponse.next();
    // Sliding renewal: past half-life, hand out a fresh year+.
    if (left < SESSION_RENEW_AFTER_S) {
      res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
    }
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next's static assets and the PWA assets — launchers
  // fetch the manifest/icons without credentials when installing to the home
  // screen, and none of them contain user data.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
