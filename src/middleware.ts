import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optional gate for hosted deployments.
//
// This is a single-user personal app with no account system. When hosted on a
// public URL you almost certainly do NOT want the whole world reading and
// writing your training log. Set APP_PASSWORD (and optionally APP_USER) in the
// host's environment and the entire app — pages and API — is protected behind
// HTTP Basic Auth. Leave APP_PASSWORD unset for local development (no prompt).
//
// Basic Auth is fine over HTTPS for one person; it is not a substitute for real
// accounts if this ever becomes multi-user.

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Fitness Tracker", charset="UTF-8"' },
  });
}

// Constant-time-ish string comparison to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // No password configured -> auth disabled (local dev).
  if (!password) return NextResponse.next();

  const expectedUser = process.env.APP_USER || "viking";

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  if (sep === -1) return unauthorized();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  const ok = safeEqual(user, expectedUser) && safeEqual(pass, password);
  return ok ? NextResponse.next() : unauthorized();
}

export const config = {
  // Protect everything except Next's static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
