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
  const [period, setPeriod] = useState<'7d' | 'all'>('7d');
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
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg border ${period === '7d' ? 'bg-black text-white' : 'bg-white'}`}
          onClick={() => setPeriod('7d')}
        >
          최근 7일
        </button>
        <button
          className={`px-4 py-2 rounded-lg border ${period === 'all' ? 'bg-black text-white' : 'bg-white'}`}
          onClick={() => setPeriod('all')}
        >
          전체 기간
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="border px-2 py-1">순위</th>
              <th className="border px-2 py-1">닉네임</th>
              <th className="border px-2 py-1">수익률</th>
              <th className="border px-2 py-1">최종 자본금</th>
            </tr>
          </thead>
          <tbody>
            {data?.top20?.length ? (
              data.top20.map((row) => (
                <tr key={row.rank} className="text-sm text-center">
                  <td className="border px-2 py-1">{row.rank}</td>
                  <td className="border px-2 py-1">{row.nickname}</td>
                  <td className={`border px-2 py-1 ${row.returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.returnPct.toFixed(2)}%
                  </td>
                  <td className="border px-2 py-1">{row.total.toLocaleString()}원</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-gray-500 text-sm py-4">데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
