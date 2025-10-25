'use client';

import { useEffect, useState } from "react";
import AdBanner from "@/components/AdBanner";

/* ===== 타입 ===== */
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
};

/* ===== 유틸 ===== */
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
function compactMoneyKR(v: number) {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  return `${Math.round(v / 10_000).toLocaleString()}만`;
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
    <main className="max-w-[1100px] mx-auto px-4 pt-6 pb-10">
      {/* 상단 히어로 */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
        <div className="relative px-4 py-5 md:px-8 md:py-7 text-center space-y-3">
          <h1 className="text-[24px] md:text-[32px] font-extrabold mb-1">🏆 랭킹</h1>
          <p className="mx-auto max-w-2xl text-[14px] md:text-[16px] text-white/90">
            실전 같은 <span className="font-semibold text-white">모의 투자</span>로 겨루는 차트게임 랭킹<br />
            나의 계급은 <span className="font-semibold text-yellow-300">🐣 주린이</span>?{" "}
            <span className="font-semibold text-yellow-300">👑 졸업자</span>?
          </p>
        </div>
      </section>

      {/* 기간 탭 */}
      <div className="mt-4 flex justify-center gap-2">
        {[
          { key: 'all', label: '전체 기간' },
          { key: '7d', label: '최근 7일' },
        ].map((p) => (
          <button
            key={p.key}
            className={`px-3 py-1.5 rounded-md border text-xs sm:text-sm font-semibold ${
              period === p.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setPeriod(p.key as '7d' | 'all')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 내 순위 */}
      {data?.myRank && (
        <section className="mt-3 rounded-xl bg-white shadow ring-1 ring-gray-200 p-2">
          <div className="overflow-x-auto">
            <table className="compact-table w-full table-fixed border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left">내 순위</th>
                  <th className="text-left">닉네임</th>
                  <th className="text-right">평균 수익률</th>
                  <th className="text-right">최종 자산</th>
                  <th className="text-center">계급</th>
                  <th className="text-right">승률</th>
                  <th className="text-right">전적</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="font-semibold">{data.myRank.rank}</td>
                  <td className="truncate">{data.myRank.nickname}</td>
                  <td className={`text-right ${rateColor(data.myRank.avgReturnPct)}`}>
                    {data.myRank.avgReturnPct.toFixed(2)}%
                  </td>
                  <td className="text-right">{compactMoneyKR(data.myRank.total)}</td>
                  <td className="text-center">{getRankBadge(data.myRank.total).icon}</td>
                  <td className="text-right">{Math.round(data.myRank.winRate)}%</td>
                  <td className="text-right">{data.myRank.wins}승 {data.myRank.losses}패</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 광고 */}
      <div className="my-6">
        <div className="mx-auto w-full max-w-[1000px] px-2">
          <div className="overflow-hidden h-[90px] sm:h-[120px]">
            <AdBanner slot="2809714485" className="h-[90px] sm:h-[120px]" />
          </div>
        </div>
      </div>

      {/* 전체 순위 */}
      <section className="mt-3 rounded-xl bg-white shadow ring-1 ring-gray-200 p-2">
        <h2 className="text-center text-base sm:text-lg font-bold mb-2">전체 순위</h2>
        {loading ? (
          <div className="py-6 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="compact-table w-full table-fixed border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left">순위</th>
                  <th className="text-left">닉네임</th>
                  <th className="text-right">평균 수익률</th>
                  <th className="text-right">최종 자산</th>
                  <th className="text-center">계급</th>
                  <th className="text-right">승률</th>
                  <th className="text-right">전적</th>
                </tr>
              </thead>
              <tbody>
                {data?.top20?.length ? (
                  data.top20.map((r) => {
                    const badge = getRankBadge(r.total);
                    return (
                      <tr key={r.rank} className="hover:bg-gray-50">
                        <td className="font-semibold">{r.rank}</td>
                        <td className="truncate">{r.nickname}</td>
                        <td className={`text-right ${rateColor(r.avgReturnPct)}`}>
                          {r.avgReturnPct.toFixed(2)}%
                        </td>
                        <td className="text-right">{compactMoneyKR(r.total)}</td>
                        <td className="text-center">{badge.icon}</td>
                        <td className="text-right">{Math.round(r.winRate)}%</td>
                        <td className="text-right">{r.wins}승 {r.losses}패</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-4">데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 스타일 압축 테이블 */}
      <style jsx>{`
        .compact-table :is(th, td) {
          padding: 2px 4px;
          font-size: 10px;
          line-height: 1.1;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .compact-table :is(th, td) {
            font-size: 11px;
            padding: 3px 6px;
          }
        }
        .compact-table thead th {
          font-weight: 700;
        }
        .compact-table tbody tr > td:first-child {
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
