// app/game/page.tsx
import { auth } from "@/lib/auth";
import ChartGame from "@/components/ChartGame";

// ✅ Server Component에서도 searchParams로 쿼리 접근 가능
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
        <main className="max-w-[1200px] mx-auto p-6 text-center">
          <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
          <p className="text-slate-600 mt-2">
            랭킹 반영과 자산 저장은 로그인 후 이용할 수 있습니다.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            {/* 로그인 페이지로 이동 (Server Component에서 onClick 사용 X) */}
            <a
              href="/api/auth/signin"
              className="w-60 rounded-xl bg-blue-600 px-5 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              🔑 로그인하고 시작하기
            </a>

            {/* 게스트 모드 진입 */}
            <a
              href="/game?guest=1"
              className="w-60 rounded-xl border-2 border-blue-500 bg-white px-5 py-3 text-lg font-bold text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              🎮 게스트 모드로 시작
            </a>
          </div>
        </main>
      );
    }
  }

  // ✅ 게스트거나(guest=1) / 로그인된 경우 → 게임 렌더
  return (
    <main className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-0">
      {/* 선택: ChartGame에 guestMode prop을 넘겨서 내부 분기 일관화 */}
      <ChartGame /* guestMode={guestMode} */ />
    </main>
  );
}
