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

  // 게스트가 아니면 기존처럼 세션 체크
  if (!guestMode) {
    const session = await auth();
    if (!session) {
     return (
  <main className="min-h-[80vh] flex items-start justify-center bg-gray-100 px-4 pt-4">
  <div className="w-full max-w-5xl rounded-2xl bg-blue-600 text-white px-8 py-6 shadow-lg text-center">
    {/* 메인 타이틀 (🚀 + 제목 한 줄) */}
    <div className="flex items-center justify-center gap-3 mb-4">
      <span className="text-4xl">🚀</span>
      <h1 className="text-4xl md:text-4xl font-extrabold text-white tracking-tight">
        주식 차트게임
      </h1>
    </div>

    {/* 본문 문구 */}
    <p className="text-xl md:text-2xl leading-snug text-blue-50 max-w-3xl mx-auto font-medium space-y-2">
      <span className="block">
        <span className="font-extrabold text-white">실제 과거 차트</span>로 즐기는 <strong>실전 감각 모의 투자 게임!</strong>
      </span>

      <span className="block">
        <strong className="text-yellow-300">로그인</strong>하면 자산이 이어지고 랭킹 점수
        <span className="underline decoration-yellow-300 decoration-2"> 실시간 반영!</span>
      </span>

      <span className="block">
        게임하면서 <span className="text-green-200 font-semibold">주식 차트 공부</span> 하자!
      </span>

      <span className="block">
        나의 계급은 과연 🐣 <span className="font-semibold">주린이</span>? 아니면 👑 <span className="font-semibold">졸업자</span>?
      </span>

      <span className="block mt-4 text-2xl font-bold text-yellow-300 animate-bounce">
        지금 바로 시작해 나만의 기록을 세워보세요!
      </span>
    </p>



      {/* 버튼 영역 */}
      <div className="flex flex-col items-center gap-4 mt-6">
        <a
          href="/api/auth/signin"
          className="w-60 rounded-xl bg-white px-5 py-3 text-lg font-bold text-blue-700 shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white text-center"
        >
          로그인하고 시작하기
        </a>

        <a
          href="/game?guest=1"
          className="w-60 rounded-xl border-2 border-white bg-blue-600 px-5 py-3 text-lg font-bold text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white text-center"
        >
          게스트 모드 시작하기
        </a>
      </div>
    </div>
  </main>
);

    }
  }

  // ✅ 게스트거나 로그인된 경우 → 게임 렌더
  return (
    <main className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-0">
      <ChartGameClient />
    </main>
  );
}

