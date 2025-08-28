import "./globals.css";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import HeaderHearts from "@/components/HeaderHearts"; 

export const metadata = {
  title: "차트게임",
  description: "50턴 차트게임",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="h-16 border-b bg-white flex items-center">
          <div className="max-w-[1200px] mx-auto w-full px-4 flex items-center justify-between">
            <nav className="flex items-center gap-4">
              <Link href="/" className="font-semibold">차트게임</Link>
              <Link href="/game" className="text-sm text-slate-600 hover:text-slate-900">게임</Link>
            </nav>

            <div className="flex items-center gap-3 text-sm">
              {session?.user ? (
                <>
                {/* 랭킹 보기 버튼 추가 */}
          <Link href="/leaderboard">
            <button className="rounded-md bg-yellow-400 hover:bg-yellow-500 px-3 py-1.5 text-sm font-semibold">
              랭킹 보기
            </button>
          </Link>
                  <span className="text-slate-600">
                    보유 자산 {((session.user as any).capital ?? 10000000).toLocaleString()}원
                  </span>
                  <HeaderHearts /> {/* ★ 하트 + 카운트다운 UI */}
                  <form action={async () => { "use server"; await signOut(); }}>
                    <button className="rounded-md border px-3 py-1.5 hover:bg-slate-50">로그아웃</button>
                  </form>
                </>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn();
                  }}
                >
                  <button className="rounded-md border px-3 py-1.5 hover:bg-slate-50">로그인</button>
                </form>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
