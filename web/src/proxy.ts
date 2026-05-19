import { NextRequest, NextResponse } from "next/server";
import type { ProxyConfig } from "next/server";

/**
 * Smart Wardrobe AI — Edge Proxy
 * (Renamed from middleware.ts → proxy.ts for Next.js 16 compatibility)
 *
 * Runs on the Next.js Edge Runtime before every matched request.
 * Reads the `sw_token` cookie (set by authStore.setAuth) to determine
 * authentication state — localStorage is NOT accessible here.
 *
 * RULES
 *   1. Unauthenticated → protected route  : redirect to /login?from=<path>
 *   2. Authenticated   → auth route       : redirect to /dashboard
 *   3. All other cases                    : pass through
 */

// Route matchers

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/wardrobe",
  "/outfits",
  "/saved-outfits",
  "/travel",
  "/settings",
];

const AUTH_PREFIXES = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

// Proxy handler — identical signature to the old middleware export

export default function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sw_token")?.value;

  // Rule 1 — No token → block protected routes
  if (isProtected(pathname) && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rule 2 — Has token → skip auth pages
  if (isAuthRoute(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Config — same matcher shape, now typed as ProxyConfig

export const config: ProxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
