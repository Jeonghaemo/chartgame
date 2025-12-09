'use client';

import { useEffect, useState } from "react";
import AdBanner from "@/components/AdBanner";


/* ===== 타입/유틸: 기존 그대로 ===== */
type RankRow = {
  rank: number;
  nickname: string;
  returnPct: number;
  total: number;
  games: number;
  avgReturnPct: number;
  wins: number;
  losses: number;
  winRate: number;
};
type LeaderboardResponse = {
  ok: boolean;
  period: string;
  top20: RankRow[];
  myRank: RankRow | null;
  totalPlayers?: number; // 전체 랭킹 대상 인원 (옵셔널로 둬서 기존 응답도 안전)
};

function getRankBadge(total: number) {
  if (total >= 5_000_000_000)
    return { name: "졸업자", icon: "👑", color: "bg-purple-100 text-purple-700", range: "5,000,000,000원 이상" };
  if (total >= 1_000_000_000)
    return { name: "승리자", icon: "🏆", color: "bg-yellow-100 text-yellow-800", range: "1,000,000,000원 ~ 4,999,999,999원" };
  if (total >= 100_000_000)
    return { name: "물방개", icon: "🐳", color: "bg-blue-100 text-blue-800", range: "100,000,000원 ~ 499,999,999원" };
  if (total >= 50_000_000)
    return { name: "불장러", icon: "🚀", color: "bg-red-100 text-red-700", range: "50,000,000원 ~ 99,999,999원" };
  if (total >= 20_000_000)
    return { name: "존버러", icon: "🐢", color: "bg-green-100 text-green-700", range: "20,000,000원 ~ 49,999,999원" };
  return { name: "주린이", icon: "🐣", color: "bg-gray-100 text-gray-700", range: "20,000,000원 미만" };
}

function TooltipBadge({ badge }: { badge: ReturnType<typeof getRankBadge> }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(!show)}
    >
      <span className={`px-2 py-1 rounded-full text-sm font-semibold cursor-pointer ${badge.color}`}>
        {badge.icon} {badge.name}
      </span>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-[220px] px-3 py-2 bg-black text-white text-xs rounded-lg shadow-lg z-10">
          {badge.range}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-6 border-r-6 border-b-8 border-transparent border-b-black"></div>
        </div>
      )}
    </div>
  );
}

/* ✅ 한국식 금액 변환 함수 (500만, 1억2300만 등) */
function formatKoreanMoney(num: number): string {
  if (!Number.isFinite(num)) return "0";
  const n = Math.floor(num);
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.floor((n % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억${man}만` : `${eok}억`;
  }
  if (n >= 10_000) {
    const man = Math.floor(n / 10_000);
    return `${man}만`;
  }
  return n.toLocaleString();
}

/* ✅ 닉네임 최대 길이 제한 (기본 12자, 초과 시 .. 붙이기) */
function truncateNickname(nickname: string, maxLen = 12): string {
  if (!nickname) return "";
  if (nickname.length <= maxLen) return nickname;
  return nickname.slice(0, maxLen) + "..";
}

/* ===== 페이지 컴포넌트 ===== */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'7d' | 'all'>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async (p: '7d' | 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const norm = (r: any): RankRow => ({
          ...r,
          returnPct: Number(r.returnPct ?? 0),
          total: Number(r.total ?? 0),
          games: Number(r.games ?? 0),
          avgReturnPct: Number(r.avgReturnPct ?? 0),
          wins: Number(r.wins ?? 0),
          losses: Number(r.losses ?? 0),
          winRate: Number(r.winRate ?? 0),
        });
        json.top20 = Array.isArray(json.top20) ? json.top20.map(norm) : [];
        json.myRank = json.myRank ? norm(json.myRank) : null;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(period); }, [period]);
  const rateColor = (v:number) => (v >= 0 ? "text-red-600" : "text-blue-600");

  return (
    <main className="max-w-[1100px] mx-auto px-6 pt-6 pb-10">
      {/* 상단 히어로 + 계급 레전드 통합 */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
        <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_300px_at_80%_20%,rgba(99,102,241,0.25),transparent_60%)]" />
        <div className="relative px-6 py-6 md:px-8 md:py-8 text-center space-y-5">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight mb-1">🏆 랭킹</h1>
            <p className="mx-auto max-w-2xl text-[15px] md:text-[16px] text-white/90 leading-snug">
              실전 같은 <span className="font-semibold text-white">모의 투자</span>로 겨루는 차트게임 랭킹<br className="hidden sm:block" />
              나의 계급은 <span className="font-semibold text-yellow-300">🐣 주린이</span>인가?{" "}
              <span className="font-semibold text-yellow-300">👑 졸업자</span>인가?
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-w-3xl mx-auto mt-3">
            {[
              { icon: "👑", label: "졸업자", range: "5,000,000,000원 ~" },
              { icon: "🏆", label: "승리자", range: "1,000,000,000원 ~" },
              { icon: "🐳", label: "물방개", range: "100,000,000원 ~" },
              { icon: "🚀", label: "불장러", range: "50,000,000원 ~" },
              { icon: "🐢", label: "존버러", range: "20,000,000원 ~" },
              { icon: "🐣", label: "주린이", range: "~ 20,000,000원" },
            ].map((t) => (
              <div key={t.label} className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-lg">{t.icon}</span>
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-[11px] text-white/70">{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ 기간 탭 */}
      <div className="mt-6 mb-2 flex items-center justify-center gap-2">
        <button
          className={`px-4 py-2 rounded-xl border text-sm font-semibold transition
                     ${period === 'all'
                       ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                       : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'}`}
          onClick={() => setPeriod('all')}
        >
          전체 기간
        </button>
        <button
          className={`px-4 py-2 rounded-xl border text-sm font-semibold transition
                     ${period === '7d'
                       ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                       : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'}`}
          onClick={() => setPeriod('7d')}
        >
          최근 7일
        </button>
      </div>

      {/* 내 순위 (있을 때만) */}
      {data?.myRank && (
        <section className="mt-4 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-3 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-xl overflow-hidden text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-xs sm:text-sm">
                  <th className="px-3 py-2 text-left whitespace-nowrap">내 순위</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">닉네임</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">평균 수익률</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">최종 자산</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">계급</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">승률</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">전적</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2 whitespace-nowrap font-semibold">{data.myRank.rank}</td>
                  <td
  className="px-3 py-2 whitespace-nowrap"
  title={data.myRank.nickname}
>
  {truncateNickname(data.myRank.nickname)}
</td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap ${rateColor(data.myRank.avgReturnPct)}`}>
                    {data.myRank.avgReturnPct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="sm:hidden">{formatKoreanMoney(data.myRank.total)}</span>
                    <span className="hidden sm:inline">{formatKoreanMoney(data.myRank.total)}</span>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="sm:hidden">{getRankBadge(data.myRank.total).icon}</span>
                    <span className="hidden sm:inline-block">
                      <TooltipBadge badge={getRankBadge(data.myRank.total)} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{data.myRank.winRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{data.myRank.wins}승 {data.myRank.losses}패</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ✅ AdSense */}
<div className="my-8">
  <div className="mx-auto w-full max-w-[1000px] px-4">
    <AdBanner slot="2809714485" />
  </div>
</div>
      

      {/* 전체 순위 */}
      <section className="mt-4 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold mb-3 text-slate-900 text-center">🏆 랭킹 TOP 20 </h2>
{data?.totalPlayers !== undefined && (
  <p className="mb-2 text-xs sm:text-sm text-slate-500 text-center">
    전체 참여자수 {data.totalPlayers.toLocaleString()}명
  </p>
)}
        {loading ? (
          <div className="py-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="w-full border-collapse rounded-xl overflow-hidden text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-xs sm:text-sm">
                  <th className="px-3 py-2 text-left whitespace-nowrap">순위</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">닉네임</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">평균 수익률</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">최종 자산</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">계급</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">승률</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">전적</th>
                </tr>
              </thead>
              <tbody>
                {data?.top20?.length ? (
                  <>
                    {data.top20.map((row) => {
                      let rowClass = "hover:bg-gray-50 transition";
                      let medal = "", rankStyle = "font-medium";
                      if (row.rank === 1) { medal = "🥇"; rowClass = "bg-yellow-50 hover:bg-yellow-100 font-bold"; rankStyle = "text-yellow-700 text-lg font-bold"; }
                      else if (row.rank === 2) { medal = "🥈"; rowClass = "bg-gray-100 hover:bg-gray-200 font-semibold"; rankStyle = "text-gray-600 text-lg font-semibold"; }
                      else if (row.rank === 3) { medal = "🥉"; rowClass = "bg-orange-50 hover:bg-orange-100 font-semibold"; rankStyle = "text-orange-700 text-lg font-semibold"; }

                      const badge = getRankBadge(row.total);

                      return (
                        <tr key={row.rank} className={rowClass}>
                          <td className={`px-3 py-2 whitespace-nowrap ${rankStyle}`}>
                            {medal && <span className="mr-1">{medal}</span>}
                            {row.rank}
                          </td>
                          <td
  className="px-3 py-2 whitespace-nowrap"
  title={row.nickname}
>
  {truncateNickname(row.nickname)}
</td>
                          <td className={`px-3 py-2 text-right whitespace-nowrap ${rateColor(row.avgReturnPct)}`}>
                            {row.avgReturnPct.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="sm:hidden">{formatKoreanMoney(row.total)}</span>
                            <span className="hidden sm:inline">{formatKoreanMoney(row.total)}</span>
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="sm:hidden">{badge.icon}</span>
                            <span className="hidden sm:inline-block">
                              <TooltipBadge badge={badge} />
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{row.winRate.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{row.wins}승 {row.losses}패</td>
                        </tr>
                      );
                    })}

                    {data?.myRank && !data.top20.some(r => r.rank === data.myRank!.rank) && (
                      <tr className="bg-blue-50 border-2 border-blue-300 font-bold">
                        <td className="px-3 py-2 whitespace-nowrap">{data.myRank.rank}</td>
                        <td
  className="px-3 py-2 whitespace-nowrap"
  title={data.myRank.nickname}
>
  {truncateNickname(data.myRank.nickname)}
</td>
                        <td className={`px-3 py-2 text-right whitespace-nowrap ${rateColor(data.myRank.avgReturnPct)}`}>
                          {data.myRank.avgReturnPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="sm:hidden">{formatKoreanMoney(data.myRank.total)}</span>
                          <span className="hidden sm:inline">{formatKoreanMoney(data.myRank.total)}</span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="sm:hidden">{getRankBadge(data.myRank.total).icon}</span>
                          <span className="hidden sm:inline-block">
                            <TooltipBadge badge={getRankBadge(data.myRank.total)} />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{data.myRank.winRate.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{data.myRank.wins}승 {data.myRank.losses}패</td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={7} className="text-gray-500 text-sm py-6 text-center">데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 모바일에서만 테이블 패딩 줄이기 */}
      <style jsx>{`
        @media (max-width: 768px) {
          table th,
          table td {
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
        }
      `}</style>
    </main>
  );
}
