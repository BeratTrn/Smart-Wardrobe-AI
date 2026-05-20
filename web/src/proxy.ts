import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface ProxyConfig { matcher: string[]; }

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    return NextResponse.rewrite(`${backendUrl}${pathname}${search}`);
  }
  return NextResponse.next();
}

export const config: ProxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
