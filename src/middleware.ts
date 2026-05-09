import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

// Minimal CookieStore adapter for middleware (read-only auth check).
// iron-session's CookieStore requires a set() method but middleware never writes cookies.
function makeCookieStore(request: NextRequest) {
  return {
    get: (name: string) => {
      const cookie = request.cookies.get(name);
      return cookie ? { name: cookie.name, value: cookie.value } : undefined;
    },
    set: () => {
      // no-op: middleware is read-only; session writes happen only in server actions
    },
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and its assets — CRITICAL: missing this causes infinite redirect loop
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // In middleware (edge runtime), use a CookieStore adapter over request.cookies
  const session = await getIronSession<SessionData>(makeCookieStore(request), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except Next.js internals and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
