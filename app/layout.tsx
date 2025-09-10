import "./globals.css";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import HeartStatusSync from "@/components/HeartStatusSync";
import NavMenu from "@/components/NavMenu"; // ⬅️ 추가

export const metadata = { title: "차트게임", description: "50턴 차트게임" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {/* 헤더 높이도 살짝 키움 */}
        <header className="h-20 border-b bg-white flex items-center">
          <div className="max-w-[1200px] mx-auto w-full px-4 flex items-center justify-between">
            {/* 네비게이션 (Pill + Active 구분) */}
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

        {/* 하트/쿨다운 백그라운드 동기화 (UI에 안 보임) */}
        <HeartStatusSync />

        {children}
      </body>
    </html>
  );
}