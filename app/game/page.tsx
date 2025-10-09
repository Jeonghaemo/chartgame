// app/game/page.tsx
import { auth } from "@/lib/auth";
import dynamic from "next/dynamic";

// ✅ ChartGame을 클라이언트 전용으로 로드 (SSR 차단)
const ChartGameClient = dynamic(() => import("@/components/ChartGame"), {
  ssr: false,
});

export default async function GamePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const guestMode = searchParams?.guest === "1";

  // 게스트가 아니면 세션 체크
  if (!guestMode) {
    const session = await auth();
    if (!session) {
      // ✅ 로그인 유도 화면 (홈 Hero와 통일된 다크 그라데이션 + 미니멀)
      return (
        <main className="max-w-[1100px] mx-auto px-6 pt-6 pb-10">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
            {/* 은은한 라디얼 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_300px_at_80%_20%,rgba(99,102,241,0.25),transparent_60%)]"
            />
            <div className="relative px-6 py-8 md:px-10 md:py-10 text-center">
              {/* 타이틀 */}
              <h1 className="text-[30px] md:text-[38px] font-extrabold tracking-tight mb-3">
                🚀 주식 차트게임
              </h1>

              {/* 설명 */}
              <p className="mx-auto max-w-2xl text-[16px] md:text-[18px] text-slate-100/95 leading-snug font-medium">
                <span className="font-semibold text-white">실제 과거 차트</span>로 즐기는
                주식 모의 투자 게임. 랭킹 경쟁까지! 🏆
              </p>

              <p className="mt-2 text-[15px] md:text-[17px] text-slate-200/90">
                로그인하면 자산이 이어지고 랭킹 점수 <span className="font-semibold">실시간 반영!</span>
                <br className="hidden sm:block" />
                나의 계급은 <span className="font-semibold text-yellow-300">🐣 주린이</span>? 아니면{" "}
                <span className="font-semibold text-yellow-300">👑 졸업자</span>?
              </p>

              {/* 버튼들: a 링크(하드 네비) → 전면광고 트리거에도 적합 */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/api/auth/signin"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl
                            bg-white text-slate-900 font-extrabold tracking-tight
                            px-5 py-3 text-lg shadow-sm hover:bg-slate-50 transition
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  로그인하고 시작하기
                </a>

                <a
                  href="/game?guest=1"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl
                            border border-white/20 bg-transparent text-white
                            px-5 py-3 text-lg font-extrabold tracking-tight
                            hover:bg-white/10 transition
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  게스트 모드 시작하기
                </a>
              </div>

             
            </div>
          </section>
        </main>
      );
    }
  }

  // ✅ 게스트거나 로그인된 경우 → 게임 렌더
  return (
    <main className="max-w-[1300px] mx-auto px-4 py-4">
      {/* 게임 캔버스: 여백 최소화, 컨테이너만 유지 */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-0">
        <ChartGameClient />
      </div>
    </main>
  );
}


