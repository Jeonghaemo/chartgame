// app/layout.tsx
import "./globals.css";
import { auth } from "@/lib/auth";
import HeartStatusSync from "@/components/HeartStatusSync";
import NavMenu from "@/components/NavMenu";
import Providers from "@/components/Providers";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";

export const metadata = { 
  title: "차트게임", 
  description: "50턴 차트게임",
  // ✅ 애드센스 메타 태그를 metadata에 추가
  other: {
    'google-adsense-account': 'ca-pub-4564123418761220'
  }
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
      <body className={`${notoSans.className} min-h-screen bg-slate-50 text-slate-900`}>
        {/* ✅ Next.js Script 컴포넌트로 애드센스 스크립트 추가 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4564123418761220"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* 헤더 */}
        <header className="h-20 border-b bg-white flex items-center">
          {/* ✅ NavMenu만 중앙 정렬 */}
          <div className="max-w-[1200px] mx-auto w-full px-4 flex justify-center">
            <NavMenu />
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