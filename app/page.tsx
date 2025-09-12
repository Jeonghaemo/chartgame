// app/page.tsx
import { auth } from "@/lib/auth";
import HomeTopGrid from "@/components/HomeTopGrid";

export default async function Home() {
  const session = await auth();

  return (
    <main className="max-w-[1300px] mx-auto px-8 pt-2 pb-8">
  {/* Hero 섹션 */}
 <section className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-6 shadow-xl text-center">
  {/* 타이틀 */}
  <h1 className="text-3xl md:text-3xl font-extrabold tracking-tight mb-3 drop-shadow-lg">
    🚀 주식 차트게임
  </h1>

  {/* 본문 문구 */}
  <p className="text-lg md:text-xl text-blue-50 max-w-2xl mx-auto leading-snug space-y-2">
    <span className="block">
      실제 과거 차트로 펼쳐지는 <span className="font-semibold text-white">모의 투자 게임!</span>
    </span>
    <span className="block">
      최고의 투자자는 누구일까? 🏆
    </span>
    <span className="block">
      나의 계급은 과연 <span className="font-bold text-yellow-300">🐣 주린이</span>?
    </span>
    <span className="block">
      아니면 <span className="font-bold text-yellow-300">👑 졸업자</span>?
    </span>
  </p>
</section>


      {/* 추가 정보 영역 */}
      <section className="mt-4">
        <HomeTopGrid />
      </section>
    </main>
  );
}
