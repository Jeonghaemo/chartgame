'use client';

import { useEffect, useState } from "react";

type RankRow = {
  rank: number;
  nickname: string;
  returnPct: number;     // 최근판 수익률(정렬 기준 유지용)
  total: number;
  games: number;         // ✅ 추가
  avgReturnPct: number;  // ✅ 추가 (기간 내 평균)
  wins: number;          // ✅ 추가
  losses: number;        // ✅ 추가
  winRate: number;       // ✅ 추가
};

type LeaderboardResponse = {
  ok: boolean;
  period: string;
  top20: RankRow[];
  myRank: RankRow | null;
};

// 계급 뱃지 데이터
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

// 말풍선 툴팁 컴포넌트
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
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] px-3 py-2 bg-black text-white text-xs rounded-lg shadow-lg z-10">
          {badge.range}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-6 border-r-6 border-b-8 border-transparent border-b-black"></div>
        </div>
      )}
    </div>
  );
}

// 🔹 상단 계급 레전드
const TIERS = [
  { min: 5_000_000_000, label: "졸업자", icon: "👑",  range: "5,000,000,000원 ~" },
  { min:   1_000_000_000, label: "승리자", icon: "🏆",  range: "1,000,000,000원 ~" },
  { min:   100_000_000, label: "물방개", icon: "🐳",  range: "100,000,000원 ~" },
  { min:    50_000_000, label: "불장러", icon: "🚀",  range: "50,000,000원 ~" },
  { min:    20_000_000, label: "존버러", icon: "🐢",  range: "20,000,000원 ~" },
  { min:             0, label: "주린이", icon: "🐣",  range: "~ 20,000,000원" },
];

function TierLegend() {
  return (
    <div className="grid md:grid-cols-3 gap-2 mb-6">
      {TIERS.map(t => (
        <div key={t.label} className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-white">
          <span className="text-base">{t.icon}</span>
          <span className="text-sm font-bold">{t.label}</span>
          <span className="text-xs text-gray-500">· {t.range}</span>
        </div>
      ))}
    </div>
  );
}

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
        // 방어적 숫자화(선택)
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
    <div className="max-w-5xl mx-auto px-8 py-6">
      <h1 className="text-2xl font-bold mb-4">🏆 랭킹</h1>

      {/* 기간 선택 탭 */}
      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded-lg border ${period === 'all' ? 'bg-black text-white' : 'bg-white'}`} onClick={() => setPeriod('all')}>전체 기간</button>
        <button className={`px-4 py-2 rounded-lg border ${period === '7d' ? 'bg-black text-white' : 'bg-white'}`} onClick={() => setPeriod('7d')}>최근 7일</button>
      </div>

      {/* 계급 레전드 */}
      <TierLegend />

      {/* 내 순위 */}
      {data?.myRank && (
        <div className="mb-6 p-4 border-2 border-blue-400 rounded-lg bg-blue-50 shadow-md">
          <div className="flex items-center gap-2 text-lg font-bold text-blue-800">
            <span>{data.myRank.rank}위</span>
            <TooltipBadge badge={getRankBadge(data.myRank.total)} />
            <span className="text-gray-700 font-medium">
              {data.myRank.nickname} · 평균 수익률{" "}
              <span className={rateColor(data.myRank.avgReturnPct)}>{data.myRank.avgReturnPct.toFixed(2)}%</span> ·{" "}
              최종 자산 {data.myRank.total.toLocaleString()}원 ·{" "}
              승률 {data.myRank.winRate.toFixed(1)}% ({data.myRank.wins}승 {data.myRank.losses}패)
            </span>
          </div>
        </div>
      )}

      {/* 랭킹표 */}
      {loading ? (
        <div>로딩 중...</div>
      ) : (
        <table className="w-full border-collapse rounded-xl overflow-hidden shadow">
          <thead>
            <tr className="bg-gray-800 text-white text-sm">
              <th className="px-3 py-2 text-left">순위</th>
              <th className="px-3 py-2 text-left">닉네임</th>
              <th className="px-3 py-2 text-right">평균 수익률</th>   {/* ✅ 변경 */}
              <th className="px-3 py-2 text-right">최종 자산</th>
              <th className="px-3 py-2 text-center">계급</th>
              <th className="px-3 py-2 text-right">승률</th>
              <th className="px-3 py-2 text-right">전적</th>
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
                      <td className={`px-3 py-2 ${rankStyle}`}>{medal && <span className="mr-1">{medal}</span>}{row.rank}</td>
                      <td className="px-3 py-2">{row.nickname}</td>
                      <td className={`px-3 py-2 text-right ${rateColor(row.avgReturnPct)}`}>{row.avgReturnPct.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">{row.total.toLocaleString()}원</td>
                      <td className="px-3 py-2 text-center"><TooltipBadge badge={badge} /></td>
                      <td className="px-3 py-2 text-right">{row.winRate.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right">{row.wins}승 {row.losses}패 </td>
                    </tr>
                  );
                })}

                {/* 내 순위가 top20에 없을 때 */}
                {data.myRank && !data.top20.some(r => r.rank === data.myRank!.rank) && (
                  <tr className="bg-blue-50 border-2 border-blue-300 font-bold">
                    <td className="px-3 py-2">{data.myRank.rank}</td>
                    <td className="px-3 py-2">{data.myRank.nickname}</td>
                    <td className={`px-3 py-2 text-right ${rateColor(data.myRank.avgReturnPct)}`}>{data.myRank.avgReturnPct.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">{data.myRank.total.toLocaleString()}원</td>
                    <td className="px-3 py-2 text-center"><TooltipBadge badge={getRankBadge(data.myRank.total)} /></td>
                    <td className="px-3 py-2 text-right">{data.myRank.winRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">{data.myRank.wins}승 {data.myRank.losses}패</td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td colSpan={7} className="text-gray-500 text-sm py-4 text-center">데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}