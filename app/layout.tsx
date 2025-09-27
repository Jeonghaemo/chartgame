import "./globals.css";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import HeartStatusSync from "@/components/HeartStatusSync";
import NavMenu from "@/components/NavMenu";
import Providers from "@/components/Providers"; // ⬅️ 추가: SessionProvider 래퍼

export const metadata = { title: "차트게임", description: "50턴 차트게임" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="ko">
      <head>
        <script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4564123419761220"
  crossOrigin="anonymous"
/>
        <meta name="agd-partner-manual-verification" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {/* 헤더 */}
        <header className="h-20 border-b bg-white flex items-center">
          <div className="max-w-[1200px] mx-auto w-full px-4 flex items-center justify-between">
            <NavMenu />

            <div className="flex items-center gap-3 text-base">
              {session?.user ? (
                <form action={async () => { "use server"; await signOut(); }}>
                  <button className="rounded-md border px-2 py-1 hover:bg-slate-50">로그아웃</button>
                </form>
              ) : (
                <form action={async () => { "use server"; await signIn(); }}>
                  <button className="rounded-md border px-2 py-1 hover:bg-slate-50">로그인</button>
                </form>
              )}
            </div>
          </div>
        </header>

        {/* 클라이언트 전역 컨텍스트 (세션 등) */}
        <Providers>
          {/* 하트/쿨다운 동기화도 세션 의존 가능성이 있어 함께 래핑 */}
          <HeartStatusSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
