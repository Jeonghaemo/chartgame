// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import HeartStatusSync from "@/components/HeartStatusSync";
import NavMenu from "@/components/NavMenu";
import Providers from "@/components/Providers";
import { Noto_Sans_KR } from "next/font/google";

export const metadata = { title: "차트게임", description: "50턴 차트게임" };

// ✅ 사이트 전체 폰트 적용
const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ko">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4564123419761220"
          crossOrigin="anonymous"
        />
        <meta name="agd-partner-manual-verification" />
        <meta name="google-adsense-account" content="ca-pub-4564123419761220" />
      </head>
      <body className={`${notoSans.className} min-h-screen bg-slate-50 text-slate-900`}>
        {/* 헤더 */}
        <header className="h-20 border-b bg-white flex items-center">
          {/* ✅ 3열 그리드: 좌측 비움, 중앙 NavMenu, 우측 로그인 */}
          <div
  className="
    max-w-[1200px] mx-auto w-full px-4
    grid grid-cols-1 gap-2
    sm:grid-cols-[1fr_auto_1fr] sm:items-center
  "
>
  {/* 왼쪽 (로고 자리) - 모바일에서는 숨김 */}
  <div className="hidden sm:block" />

  {/* NavMenu */}
  <div className="justify-self-center">
    <NavMenu />
  </div>

  {/* 로그인/로그아웃 버튼 */}
  <div className="justify-self-center sm:justify-self-end flex items-center gap-3 text-base">
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

        {/* 클라이언트 전역 컨텍스트 */}
        <Providers>
          <HeartStatusSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
