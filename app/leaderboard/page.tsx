'use client';

import { useEffect, useState } from "react";

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

/* ✅ 한국식 금액 변환 함수 추가 */
function formatKoreanMoney(num: number): string {
  if (num >= 100_000_000) {
    const eok = Math.floor(num / 100_000_000);
    const man = Math.floor((num % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억${man}만` : `${eok}억`;
  }
  if (num >= 10_000) {
    const man = Math.floor(num / 10_000);
    return `${man}만`;
  }
  return num.toLocaleString();
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
      {/* ...중간 동일 코드 생략... */}

      {/* 내 순위 */}
      {data?.myRank && (
        <section className="mt-4 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-3 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-xl overflow-hidden text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-xs sm:text-sm">
                  <th>내 순위</th>
                  <th>닉네임</th>
                  <th className="text-right">평균 수익률</th>
                  <th className="text-right">최종 자산</th>
                  <th className="text-center">계급</th>
                  <th className="text-right">승률</th>
                  <th className="text-right">전적</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 transition">
                  <td>{data.myRank.rank}</td>
                  <td>{data.myRank.nickname}</td>
                  <td className={`text-right ${rateColor(data.myRank.avgReturnPct)}`}>
                    {data.myRank.avgReturnPct.toFixed(2)}%
                  </td>
                  {/* ✅ 여기 변경됨 */}
                  <td className="text-right">{formatKoreanMoney(data.myRank.total)}</td>
                  <td className="text-center">
                    <TooltipBadge badge={getRankBadge(data.myRank.total)} />
                  </td>
                  <td className="text-right">{data.myRank.winRate.toFixed(1)}%</td>
                  <td className="text-right">{data.myRank.wins}승 {data.myRank.losses}패</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 전체 순위 */}
      <section className="mt-4 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold mb-3 text-slate-900 text-center">전체 순위</h2>

        {loading ? (
          <div className="py-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="w-full border-collapse rounded-xl overflow-hidden text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-xs sm:text-sm">
                  <th>순위</th>
                  <th>닉네임</th>
                  <th className="text-right">평균 수익률</th>
                  <th className="text-right">최종 자산</th>
                  <th className="text-center">계급</th>
                  <th className="text-right">승률</th>
                  <th className="text-right">전적</th>
                </tr>
              </thead>
              <tbody>
                {data?.top20?.length ? (
                  data.top20.map((row) => {
                    const badge = getRankBadge(row.total);
                    return (
                      <tr key={row.rank} className="hover:bg-gray-50 transition">
                        <td>{row.rank}</td>
                        <td>{row.nickname}</td>
                        <td className={`text-right ${rateColor(row.avgReturnPct)}`}>
                          {row.avgReturnPct.toFixed(2)}%
                        </td>
                        {/* ✅ 여기 변경됨 */}
                        <td className="text-right">{formatKoreanMoney(row.total)}</td>
                        <td className="text-center">
                          <TooltipBadge badge={badge} />
                        </td>
                        <td className="text-right">{row.winRate.toFixed(1)}%</td>
                        <td className="text-right">{row.wins}승 {row.losses}패</td>
                      </tr>
                    );
                  })
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
