import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 구글 로그인 시작 경로 가로채기
  if (pathname.startsWith("/api/auth/signin/google")) {
    const to = `${pathname}${search || ""}`;
    const url = req.nextUrl.clone();
    url.pathname = "/open-in-browser";
    url.search = `?to=${encodeURIComponent(to)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 구글 로그인 경로만 감시
export const config = {
  matcher: ["/api/auth/signin/google"],
};
