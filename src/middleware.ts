import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) return NextResponse.next();
  if (pathname.startsWith("/api/health")) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
