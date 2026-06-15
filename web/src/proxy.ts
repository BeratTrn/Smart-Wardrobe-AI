import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface ProxyConfig { matcher: string[]; }

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/verify-email"];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // API proxy
  if (pathname.startsWith("/api/")) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
    return NextResponse.rewrite(`${backendUrl}${pathname}${search}`);
  }

  // Auth guard: public route'lara izin ver
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Token yoksa login'e yönlendir
  const token = request.cookies.get("sw_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config: ProxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
