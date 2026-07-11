import { auth } from "@/auth";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isCrossOriginRequest(req: { headers: Headers; nextUrl: URL }) {
  const origin = req.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin !== req.nextUrl.origin;
  } catch {
    return true;
  }
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (MUTATING_METHODS.has(req.method) && isCrossOriginRequest(req)) {
    return new NextResponse(null, { status: 403 });
  }

  if (pathname.startsWith("/qr")) {
    const limit = checkRequestRateLimit(req, {
      key: "qr-public",
      limit: 120,
      windowMs: 60 * 1_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  }

  const publicPaths = [
    "/login",
    "/logout",
    "/api/auth",
    "/api/connectivity",
    "/qr",
  ];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|public/).*)",
  ],
};
