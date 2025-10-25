'use client';

import { useEffect, useState } from "react";

/* ===== 타입/유틸 ===== */
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
        <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-max max-w-[220px] px-2 py-1.5 bg-black text-white text-xs rounded-md shadow-lg z-10">
          {badge.range}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-black"></div>
        </div>
      )}
    </div>
  );
}
const TIERS = [
  { min: 5_000_000_000, label: "졸업자", icon: "👑", range: "5,000,000,000원 ~" },
  { min: 1_000_000_000, label: "승리자", icon: "🏆", range: "1,000,000,000원 ~" },
  { min: 100_000_000, label: "물방개", icon: "🐳", range: "100,000,000원 ~" },
  { min: 50_000_000, label: "불장러", icon: "🚀", range: "50,000,000원 ~" },
  { min: 20_000_000, label: "존버러", icon: "🐢", range: "20,000,000원 ~" },
  { min: 0, label: "주린이", icon: "🐣", range: "~ 20,000,000원" },
];
function TierLegend() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
      {TIERS.map((t) => (
        <div key={t.label} className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white shadow-sm">
          <span className="text-base">{t.icon}</span>
          <span className="text-xs font-semibold">{t.label}</span>
          <span className="text-[10px] text-white/70">{t.range}</span>
        </div>
      ))}
    </div>
  );
}

/* ===== 페이지 ===== */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'7d' | 'all'>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const rateColor = (v: number) => (v >= 0 ? "text-red-600" : "text-blue-600");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const norm = (r: any): RankRow => ({
            ...r,
            rank: +r.rank,
            total: +r.total,
            avgReturnPct: +r.avgReturnPct,
            wins: +r.wins,
            losses: +r.losses,
            winRate: +r.winRate,
          });
          json.top20 = json.top20.map(norm);
          json.myRank = json.myRank ? norm(json.myRank) : null;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  return (
    <main className="max-w-[1100px] mx-auto px-2 pt-6 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
        <div className="relative px-4 py-5 md:px-6 md:py-6 text-center space-y-4">
          <div>
            <h1 className="text-[26px] md:text-[32px] font-extrabold mb-1">🏆 랭킹</h1>
            <p className="mx-auto max-w-xl text-[14px] md:text-[15px] text-white/90 leading-snug">
              실전 같은 <span className="font-semibold text-white">모의 투자</span>로 겨루는 차트게임 랭킹
              <br className="hidden sm:block" />
              나의 계급은 <span className="font-semibold text-yellow-300">🐣 주린이</span>?{" "}
              <span className="font-semibold text-yellow-300">👑 졸업자</span>?
            </p>
          </div>
          <TierLegend />
        </div>
      </section>

      {/* 기간 탭 */}
      <div className="mt-5 mb-2 flex justify-center gap-1.5">
        {[
          { key: "all", label: "전체 기간" },
          { key: "7d", label: "최근 7일" },
        ].map((p) => (
          <button
            key={p.key}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition
                       ${period === p.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"}`}
            onClick={() => setPeriod(p.key as "7d" | "all")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 내 순위 */}
      {data?.myRank && (
        <section className="mt-3 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-2 sm:p-3">
          <div className="overflow-x-auto">
            <table className="tight-table w-full table-fixed text-[11px] sm:text-sm min-w-[700px] border-collapse">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th>내 순위</th>
                  <th>닉네임</th>
                  <th>평균 수익률</th>
                  <th>최종 자산</th>
                  <th>계급</th>
                  <th>승률</th>
                  <th>전적</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="font-semibold">{data.myRank.rank}</td>
                  <td className="truncate">{data.myRank.nickname}</td>
                  <td className={`text-right ${rateColor(data.myRank.avgReturnPct)}`}>{data.myRank.avgReturnPct.toFixed(2)}%</td>
                  <td className="text-right">{data.myRank.total.toLocaleString()}원</td>
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
      <section className="mt-3 rounded-2xl bg-white shadow ring-1 ring-gray-200 p-2 sm:p-3">
        <h2 className="text-center text-base sm:text-lg font-bold mb-2">전체 순위</h2>
        {loading ? (
          <div className="py-6 text-center text-gray-500 text-sm">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tight-table w-full table-fixed text-[11px] sm:text-sm min-w-[700px] border-collapse">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th>순위</th>
                  <th>닉네임</th>
                  <th>평균 수익률</th>
                  <th>최종 자산</th>
                  <th>계급</th>
                  <th>승률</th>
                  <th>전적</th>
                </tr>
              </thead>
              <tbody>
                {data?.top20?.length ? (
                  data.top20.map((r) => {
                    const badge = getRankBadge(r.total);
                    return (
                      <tr key={r.rank} className="hover:bg-gray-50">
                        <td>{r.rank}</td>
                        <td className="truncate">{r.nickname}</td>
                        <td className={`text-right ${rateColor(r.avgReturnPct)}`}>{r.avgReturnPct.toFixed(2)}%</td>
                        <td className="text-right">{r.total.toLocaleString()}원</td>
                        <td className="text-center"><TooltipBadge badge={badge} /></td>
                        <td className="text-right">{r.winRate.toFixed(1)}%</td>
                        <td className="text-right">{r.wins}승 {r.losses}패</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="text-center py-4 text-gray-500 text-sm">데이터가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 패딩 최소화 스타일 */}
      <style jsx>{`
        .tight-table th,
        .tight-table td {
          padding: 0.35rem 0.0625rem; /* 세로 5~6px, 좌우 약 1px */
        }
      `}</style>
    </main>
  );
}
