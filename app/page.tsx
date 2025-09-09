// app/page.tsx
import { auth } from "@/lib/auth";
import HomeTopGrid from "@/components/HomeTopGrid";

export default async function Home() {
  const session = await auth();

  return (
    <main className="max-w-[1300px] mx-auto p-8">
      {/* Hero 섹션 */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-10 shadow-lg text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          🚀 주식 차트게임
        </h1>
       <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
  실제 과거 차트로 펼쳐지는 모의 투자 게임! <br />
  최고의 투자자는 누구일까? <br />나의 계급은 과연 <span className="font-bold">🐣 주린이</span>? 아니면 <span className="font-bold">👑 졸업자</span>? <br />
</p>

       
      </section>

      {/* 추가 정보 영역 */}
      <section className="mt-10">
        <HomeTopGrid />
      </section>
    </main>
  );
}
