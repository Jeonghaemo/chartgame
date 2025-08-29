import { auth } from "@/lib/auth";
import ChartGame from "@/components/ChartGame";

export default async function GamePage() {
  const session = await auth();
  if (!session) {
    return (
      <main className="max-w-[1200px] mx-auto p-6">
        <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
        <p className="text-slate-600 mt-2">우측 상단의 로그인 버튼을 눌러 진행하세요.</p>
      </main>
    );
  }

  return (
    <main className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-0">
      
      <ChartGame />
    </main>
  );
}
