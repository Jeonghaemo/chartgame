import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="max-w-[1200px] mx-auto p-6">
      <h1 className="text-2xl font-bold"> 50턴 차트게임</h1>
      <p className="mt-2 text-slate-600">
        차트가 미리 보이는 상태에서 50거래일 동안 매수/매도로 수익을 노려보자. 하트는 1시간마다 1개씩 충전되고 게임 1판에 1개 차감된다.
      </p>
      <div className="mt-6">
        <Link href="/game" className="inline-block rounded-lg bg-black text-white px-4 py-2 font-semibold">게임 시작</Link>
      </div>
      {!session?.user && <p className="mt-3 text-sm text-slate-500">게임을 하려면 우측 상단에서 로그인한다.</p>}
    </main>
  );
}
