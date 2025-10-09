// components/HomeTopGrid.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import AdRecharge from "@/components/AdRecharge";
import { Heart } from "lucide-react";
import { useUserStore } from "@/lib/store/user";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react"; // ✅ 클라이언트용

// 하트 카운트다운 훅
function useHeartCountdown(
  lastRefillAt?: string | Date | null,
  hearts?: number,
  maxHearts?: number
) {
  const [remain, setRemain] = useState<string>("");

  useEffect(() => {
    if (!lastRefillAt || hearts == null || maxHearts == null || hearts >= maxHearts) {
      setRemain("");
      return;
    }
    const tick = () => {
      const last = new Date(lastRefillAt).getTime();
      const next = last + 1000 * 60 * 60; // 1시간
      const diff = Math.max(0, next - Date.now());
      const mm = String(Math.floor(diff / 1000 / 60)).padStart(2, "0");
      const ss = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
      setRemain(`${mm}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastRefillAt, hearts, maxHearts]);

  return remain;
}

type MyRank = {
  rank: number;
  total: number;
  avgReturnPct?: number;
  winRate?: number;
  wins?: number;
  losses?: number;
};

// === [UTIL] 내 순위/계급 표시용 ===
function getRankBadge(total: number) {
  if (total >= 5_000_000_000) return { name: "졸업자", icon: "👑", color: "bg-purple-100 text-purple-700" };
  if (total >= 1_000_000_000) return { name: "승리자", icon: "🏆", color: "bg-yellow-100 text-yellow-800" };
  if (total >= 100_000_000) return { name: "물방개", icon: "🐳", color: "bg-blue-100 text-blue-800" };
  if (total >= 50_000_000) return { name: "불장러", icon: "🚀", color: "bg-red-100 text-red-700" };
  if (total >= 20_000_000) return { name: "존버러", icon: "🐢", color: "bg-green-100 text-green-700" };
  return { name: "주린이", icon: "🐣", color: "bg-gray-100 text-gray-700" };
}

export default function HomeTopGrid() {
  const { data: session } = useSession(); // ✅ 세션
  const hearts = useUserStore((s) => s.hearts) ?? 0;
  const maxHearts = useUserStore((s) => s.maxHearts) ?? 5;
  const lastRefillAt = useUserStore((s) => s.lastRefillAt);
  const setHearts = useUserStore((s) => s.setHearts);

  const [startCapital, setStartCapital] = useState<number>(10_000_000);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const countdown = useHeartCountdown(lastRefillAt, hearts, maxHearts);

  // 세션 + /api/me 값을 병합해서 표시
  const displayName = userName ?? (session?.user?.name ?? null);
  const displayEmail = userEmail ?? (session?.user?.email ?? null);

  // 내 정보 + 랭킹 불러오기
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (typeof j?.user?.capital === "number") setStartCapital(j.user.capital);
          if (typeof j?.user?.hearts === "number") setHearts(j.user.hearts);
          if (typeof j?.user?.name === "string") setUserName(j.user.name);
          if (typeof j?.user?.email === "string") setUserEmail(j.user.email);
        }
      } catch {}
      try {
        // 전체기간 우선 호출 (API가 지원하면 all 사용)
        let r2 = await fetch("/api/leaderboard?period=all", { cache: "no-store" });
        // 호환용 폴백: all 미지원이면 파라미터 없이 전체기간 기본값
        if (!r2.ok) {
          r2 = await fetch("/api/leaderboard", { cache: "no-store" });
        }
        if (r2.ok) {
          const j2 = await r2.json();
          if (j2?.myRank) {
            setMyRank({
              rank: Number(j2.myRank.rank ?? 0),
              total: Number(j2.myRank.total ?? 0),
              avgReturnPct: Number(j2.myRank.avgReturnPct ?? 0),
              winRate: Number(j2.myRank.winRate ?? 0),
              wins: Number(j2.myRank.wins ?? 0),
              losses: Number(j2.myRank.losses ?? 0),
            });
          }
        }
      } catch {}
    })();
  }, [setHearts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
      {/* 왼쪽: 보유 자산 + 하트 + 카운트다운 + 순위/계급 */}
      <Card className="p-4">
        {/* 상단 헤더: 이메일만 최상단 → '내 보유 자산' 크게 → 금액 더 크게 → 버튼 한 줄 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* 이메일만 표시 (맨 위) */}
            {displayEmail ? (
              <div className="text-xs text-gray-500 leading-tight break-all">{displayEmail}</div>
            ) : (
              <div className="text-xs text-gray-400 leading-tight">미로그인 사용자</div>
            )}

            {/* 현재 자산 + 금액 한 줄 */}
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl sm:text-xl font-bold text-slate-900">현재 자산</span>
              <span className="text-xl sm:text-xl font-bold text-slate-800 tracking-tight">
                {(startCapital || 10_000_000).toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 버튼: 한 줄 고정 */}
          <button
            onClick={async () => {
              if (!confirm("자산을 초기화하시겠습니까? 300만원 이하시 초기화 가능 (하루 1회 제한)")) return;
              try {
                const r = await fetch("/api/reset-capital", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                });
                const j = await r.json();
                if (!r.ok || !j?.ok) {
                  alert(j?.message ?? "초기화 실패");
                  return;
                }
                alert(`자산이 ${j.capital.toLocaleString()}원으로 초기화되었습니다.`);
                location.reload();
              } catch {
                alert("초기화 중 오류가 발생했습니다.");
              }
            }}
            className="ml-3 shrink-0 whitespace-nowrap self-start rounded-lg border px-2 py-1
                       text-xs font-semibold text-red-600 border-red-300 bg-red-50
                       hover:bg-red-100 hover:border-red-400 shadow-sm transition"
            title="자산을 초기화합니다"
          >
            자산 초기화
          </button>
        </div>

      

        {/* 하트 + 카운트다운 + [모바일 전용 로그인/로그아웃 버튼] */}
<div className="mt-2 flex items-center justify-between text-base font-medium">
  {/* 왼쪽: 하트 + 카운트다운 */}
  <div className="flex items-center gap-2">
    <Heart className={`w-5 h-5 ${hearts >= maxHearts ? "fill-red-500 text-red-500" : "text-red-500"}`} />
    <span>{hearts} / {maxHearts}</span>
    {countdown && (
      <span className="ml-1 text-xs font-normal text-gray-500">⏳ {countdown} 후 + 1</span>
    )}
  </div>

  {/* 오른쪽: 모바일 전용 로그인/로그아웃 버튼 */}
  <div className="sm:hidden">
    {session?.user ? (
      <button
        onClick={() => signOut()}
        className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
      >
        로그아웃
      </button>
    ) : (
      <button
        onClick={() => signIn()}
        className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
      >
        로그인
      </button>
    )}
  </div>
</div>


        {/* 내 순위 & 계급 뱃지 & (평균/승률) */}
        {myRank && (
          <div className="mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">{myRank.rank}위</span>
              {(() => {
                const badge = getRankBadge(myRank.total);
                return (
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                    {badge.icon} {badge.name}
                  </span>
                );
              })()}
              {typeof myRank.avgReturnPct === "number" && (
                <span className={`${myRank.avgReturnPct >= 0 ? "text-red-600" : "text-blue-600"}`}>
                  평균 수익률 {myRank.avgReturnPct.toFixed(2)}%
                </span>
              )}
            </div>

            {/* 승률은 아래 줄로 분리 */}
            {typeof myRank.winRate === "number" && (
              <div className="mt-1 text-gray-600">
                승률 {myRank.winRate.toFixed(1)}%
                {myRank.wins != null && myRank.losses != null && ` (${myRank.wins}승 ${myRank.losses}패)`}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 가운데: 게임 시작 버튼 */}
<Card className="p-0 flex group">
  <Link
    href="/game"
    className="w-full h-full flex items-center justify-center 
               rounded-2xl text-2xl sm:text-4xl font-extrabold tracking-tight text-white
               bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700
               shadow-[0_4px_16px_rgba(59,130,246,0.4)]
               hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)]
               hover:scale-[1.02] active:scale-[0.99]
               transition-all duration-200 ease-out
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
               min-h-[80px] sm:min-h-[110px]">
    🚀 <span className="ml-2">차트 게임 시작</span>
  </Link>
</Card>



      {/* 오른쪽: 무료 충전(AdRecharge) */}
      <AdRecharge />
    </div>
  );
}
