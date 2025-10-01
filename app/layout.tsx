// app/layout.tsx
import "./globals.css";
import { auth, signIn, signOut } from "@/lib/auth";
import HeartStatusSync from "@/components/HeartStatusSync";
import NavMenu from "@/components/NavMenu";
import Providers from "@/components/Providers";
import { Noto_Sans_KR } from "next/font/google";
import type { Metadata } from "next";

// ✅ 메타데이터 (OG/트위터 절대경로 해석용)
export const metadata: Metadata = {
  metadataBase: new URL("https://chartgame.co.kr"),
  title: "주식 차트게임",
  description: "가상 주식투자 게임! 랭킹 경쟁, 차트 공부, 투자 계산기까지",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon-512.png",
  },
  openGraph: {
    title: "주식 차트게임",
    description: "가상 주식투자 게임! 랭킹 경쟁, 차트 공부, 투자 계산기까지",
    url: "https://chartgame.co.kr",
    siteName: "주식 차트게임",
    images: [
      {
        url: "/chartgame_og_image.png",
        width: 1200,
        height: 630,
        alt: "주식 차트게임 썸네일",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/chartgame_og_image.png"],
  },
  other: {
    // ✅ AdSense 메타 (head 최상단에 출력됨)
    "google-adsense-account": "ca-pub-4564123418761220",
  },
};

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
        {/* ✅ AdSense 스크립트 (head에 직접 삽입 / 중복 금지) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4564123418761220"
          crossOrigin="anonymous"
        />
      </head>

      <body className={`${notoSans.className} min-h-screen bg-slate-50 text-slate-900`}>
        {/* 헤더 */}
        <header className="h-16 border-b bg-white flex items-center">
          {/*
            ✅ 반응형 3열 그리드:
            - 모바일: 1열(위 Nav, 아래 버튼 중앙)
            - 데스크탑(sm 이상): [왼쪽 비움] [가운데 NavMenu] [오른쪽 버튼]
          */}
          <div className="max-w-[1200px] mx-auto w-full px-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            {/* 왼쪽(로고 자리) - 모바일에선 숨김 */}
            <div className="hidden sm:block" />

            {/* 중앙: NavMenu */}
            <div className="justify-self-center">
              <NavMenu />
            </div>

            {/* 오른쪽: 로그인/로그아웃 버튼 (데스크탑에서만 표시) */}
<div className="hidden sm:flex justify-self-end items-center gap-3 text-base">

  {session?.user ? (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button className="rounded-md border px-3 py-1.5 hover:bg-slate-50">
        로그아웃
      </button>
    </form>
  ) : (
    <form
      action={async () => {
        "use server";
        await signIn();
      }}
    >
      <button className="rounded-md border px-3 py-1.5 hover:bg-slate-50">
        로그인
      </button>
    </form>
  )}
</div>

          </div>
        </header>
      


        {/* 전역 컨텍스트 / 동기화 */}
        <Providers>
          <HeartStatusSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
