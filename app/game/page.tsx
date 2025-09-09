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
  <main className="min-h-[80vh] flex items-start justify-center bg-gray-100 px-4 pt-20">
    <div className="w-full max-w-5xl rounded-2xl bg-blue-600 text-white px-8 py-10 shadow-lg text-center">
      {/* 🚀 아이콘 */}
      <div className="text-5xl mb-4">🚀</div>

      {/* 메인 타이틀 */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        주식 차트게임
      </h1>

      {/* 서브 텍스트 */}
      <p className="text-lg text-blue-100 mb-4">
        실제 과거 차트로 펼쳐지는 모의 투자 게임! <br />
        최고의 투자자는 누구일까? <br />
        나의 계급은 과연 🐣 주린이? 아니면 👑 졸업자?
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

