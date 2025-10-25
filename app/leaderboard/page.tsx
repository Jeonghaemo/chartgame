'use client'

import { useEffect, useState } from "react"

/* ===== 타입/유틸 ===== */
type RankRow = {
  rank: number
  nickname: string
  returnPct: number
  total: number
  games: number
  avgReturnPct: number
  wins: number
  losses: number
  winRate: number
}
type LeaderboardResponse = {
  ok: boolean
  period: string
  top20: RankRow[]
  myRank: RankRow | null
}
function getRankBadge(total: number) {
  if (total >= 5_000_000_000)
    return { name: "졸업자", icon: "👑" }
  if (total >= 1_000_000_000)
    return { name: "승리자", icon: "🏆" }
  if (total >= 100_000_000)
    return { name: "물방개", icon: "🐳" }
  if (total >= 50_000_000)
    return { name: "불장러", icon: "🚀" }
  if (total >= 20_000_000)
    return { name: "존버러", icon: "🐢" }
  return { name: "주린이", icon: "🐣" }
}

/* ===== 본문 ===== */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'7d' | 'all'>('all')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const rateColor = (v: number) => (v >= 0 ? "text-red-600" : "text-blue-600")

  const loadData = async (p: '7d' | 'all') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        const norm = (r: any): RankRow => ({
          ...r,
          rank: +r.rank, total: +r.total, avgReturnPct: +r.avgReturnPct,
          wins: +r.wins, losses: +r.losses, winRate: +r.winRate
        })
        json.top20 = json.top20.map(norm)
        json.myRank = json.myRank ? norm(json.myRank) : null
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData(period) }, [period])

  return (
    <main className="max-w-[1100px] mx-auto px-4 pt-6 pb-10">
      <h1 className="text-center text-2xl font-bold mb-3">🏆 랭킹</h1>

      <div className="flex justify-center gap-2 mb-3">
        <button
          className={`px-3 py-1 rounded border text-sm ${period === 'all' ? 'bg-slate-900 text-white' : 'bg-white border-slate-300'}`}
          onClick={() => setPeriod('all')}
        >
          전체 기간
        </button>
        <button
          className={`px-3 py-1 rounded border text-sm ${period === '7d' ? 'bg-slate-900 text-white' : 'bg-white border-slate-300'}`}
          onClick={() => setPeriod('7d')}
        >
          최근 7일
        </button>
      </div>

      {/* 내 순위 */}
      {data?.myRank && (
        <div className="overflow-x-auto mb-6">
          <table className="tight-table w-full table-fixed border-collapse min-w-[640px] text-xs sm:text-sm">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left whitespace-nowrap">내 순위</th>
                <th className="text-left whitespace-nowrap">닉네임</th>
                <th className="text-right whitespace-nowrap">평균 수익률</th>
                <th className="text-right whitespace-nowrap">최종 자산</th>
                <th className="text-center whitespace-nowrap">계급</th>
                <th className="text-right whitespace-nowrap">승률</th>
                <th className="text-right whitespace-nowrap">전적</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="font-semibold">{data.myRank.rank}</td>
                <td className="truncate">{data.myRank.nickname}</td>
                <td className={`text-right ${rateColor(data.myRank.avgReturnPct)}`}>{data.myRank.avgReturnPct.toFixed(2)}%</td>
                <td className="text-right">{data.myRank.total.toLocaleString()}원</td>
                <td className="text-center">{getRankBadge(data.myRank.total).icon}</td>
                <td className="text-right">{data.myRank.winRate.toFixed(1)}%</td>
                <td className="text-right">{data.myRank.wins}승 {data.myRank.losses}패</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 전체 순위 */}
      <div className="overflow-x-auto">
        <table className="tight-table w-full table-fixed border-collapse min-w-[640px] text-xs sm:text-sm">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left whitespace-nowrap">순위</th>
              <th className="text-left whitespace-nowrap">닉네임</th>
              <th className="text-right whitespace-nowrap">평균 수익률</th>
              <th className="text-right whitespace-nowrap">최종 자산</th>
              <th className="text-center whitespace-nowrap">계급</th>
              <th className="text-right whitespace-nowrap">승률</th>
              <th className="text-right whitespace-nowrap">전적</th>
            </tr>
          </thead>
          <tbody>
            {data?.top20?.length ? (
              data.top20.map((r) => (
                <tr key={r.rank} className="hover:bg-gray-50">
                  <td>{r.rank}</td>
                  <td className="truncate">{r.nickname}</td>
                  <td className={`text-right ${rateColor(r.avgReturnPct)}`}>{r.avgReturnPct.toFixed(2)}%</td>
                  <td className="text-right">{r.total.toLocaleString()}원</td>
                  <td className="text-center">{getRankBadge(r.total).icon}</td>
                  <td className="text-right">{r.winRate.toFixed(1)}%</td>
                  <td className="text-right">{r.wins}승 {r.losses}패</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 전체 간격 최소화 스타일 */}
      <style jsx>{`
        .tight-table th,
        .tight-table td {
          padding: 0.35rem 0.0625rem; /* 세로 5~6px, 좌우 1px 수준 */
        }
      `}</style>
    </main>
  )
}
