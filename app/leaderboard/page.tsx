'use client';

import { useEffect, useState } from "react";

type RankRow = {
  rank: number;
  nickname: string;
  returnPct: number;
  total: number;
};

type LeaderboardResponse = {
  ok: boolean;
  period: string;
  top20: RankRow[];
  myRank: RankRow | null;
};

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
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🏆 랭킹</h1>

      {/* 기간 선택 탭 */}
      {/* 기간 선택 탭 */}
<div className="flex gap-2 mb-6">
  <button
    className={`px-4 py-2 rounded-lg border ${period === 'all' ? 'bg-black text-white' : 'bg-white'}`}
    onClick={() => setPeriod('all')}
  >
    전체 기간
  </button>
  <button
    className={`px-4 py-2 rounded-lg border ${period === '7d' ? 'bg-black text-white' : 'bg-white'}`}
    onClick={() => setPeriod('7d')}
  >
    최근 7일
  </button>
</div>


      {/* 내 순위 */}
      {data?.myRank && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="font-semibold">내 순위</div>
          <div className="mt-1 text-sm text-gray-600">
            {data.myRank.rank}위 · {data.myRank.nickname} · 수익률 {data.myRank.returnPct.toFixed(2)}% · 최종자본 {data.myRank.total.toLocaleString()}원
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
      <th className="px-3 py-2 text-right">수익률</th>
      <th className="px-3 py-2 text-right">최종 자본금</th>
    </tr>
  </thead>
  <tbody>
    {data?.top20?.length ? (
      <>
        {data.top20.map((row) => {
          let rowClass = "hover:bg-gray-50 transition";
          let medal = "";
          let rankStyle = "font-medium";

          if (row.rank === 1) {
            medal = "🥇";
            rowClass = "bg-yellow-50 hover:bg-yellow-100 font-bold";
            rankStyle = "text-yellow-700 text-lg font-bold";
          } else if (row.rank === 2) {
            medal = "🥈";
            rowClass = "bg-gray-100 hover:bg-gray-200 font-semibold";
            rankStyle = "text-gray-600 text-lg font-semibold";
          } else if (row.rank === 3) {
            medal = "🥉";
            rowClass = "bg-orange-50 hover:bg-orange-100 font-semibold";
            rankStyle = "text-orange-700 text-lg font-semibold";
          }

          return (
            <tr key={row.rank} className={rowClass}>
              <td className={`px-3 py-2 ${rankStyle}`}>
                {medal && <span className="mr-1">{medal}</span>}
                {row.rank}
              </td>
              <td className="px-3 py-2">{row.nickname}</td>
              <td
                className={`px-3 py-2 text-right ${
                  row.returnPct >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {row.returnPct.toFixed(2)}%
              </td>
              <td className="px-3 py-2 text-right">
                {row.total.toLocaleString()}원
              </td>
            </tr>
          );
        })}

        {/* 내 순위가 top20에 없을 때 */}
        {data.myRank &&
          !data.top20.some((r) => r.rank === data.myRank!.rank) && (
            <tr className="bg-blue-50 border-2 border-blue-300 font-bold">
              <td className="px-3 py-2">{data.myRank.rank}</td>
              <td className="px-3 py-2">{data.myRank.nickname}</td>
              <td
                className={`px-3 py-2 text-right ${
                  data.myRank.returnPct >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {data.myRank.returnPct.toFixed(2)}%
              </td>
              <td className="px-3 py-2 text-right">
                {data.myRank.total.toLocaleString()}원
              </td>
            </tr>
          )}
      </>
    ) : (
      <tr>
        <td colSpan={4} className="text-gray-500 text-sm py-4 text-center">
          데이터가 없습니다.
        </td>
      </tr>
    )}
  </tbody>
</table>

      )}
    </div>
  );
}
