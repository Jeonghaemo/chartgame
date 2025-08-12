'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import CandleChart from '@/components/CandleChart'
import { useGame } from '@/app/game/store/gameStore'
import { valuation, pnlPct } from '@/app/game/store/helpers'
import AdRecharge from "@/components/AdRecharge";

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number }
type Trade = { side: 'BUY' | 'SELL'; price: number; qty: number; time: string }

const SYMBOL_CACHE_KEY = 'kr_symbols_v1'
const SYMBOL_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12h

export default function ChartGame() {
  const g = useGame()
  const [ohlc, setOhlc] = useState<OHLC[]>([])
  const [chartKey, setChartKey] = useState(0)
  const [chartH, setChartH] = useState(720)
  const [symbol, setSymbol] = useState<string>('') // 현재 종목 표시용
  const [gameId, setGameId] = useState<string | null>(null)

  const universeRef = useRef<string[]>([])
  const bootedRef = useRef(false)

  useEffect(() => {
    const calc = () => setChartH(Math.max(560, Math.floor(window.innerHeight - 160)))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

  const pickRandomStart = (len: number) => {
    const warmup = 120, tail = 60
    if (len <= warmup + tail) return Math.max(0, len - (tail + 1))
    const maxRand = Math.max(1, len - (warmup + tail))
    return Math.min(warmup + Math.floor(Math.random() * maxRand), len - tail)
  }

  const loadUniverse = useCallback(async (): Promise<string[]> => {
    try {
      const raw = localStorage.getItem(SYMBOL_CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as { symbols: string[]; ts: number }
        if (cached?.symbols?.length && Date.now() - cached.ts < SYMBOL_CACHE_TTL_MS) {
          return cached.symbols
        }
      }
      const r = await fetch('/api/kr/symbols', { cache: 'no-store' })
      const { symbols } = (await r.json()) as { symbols: string[] }
      const list = (symbols ?? []).filter(Boolean)
      if (list.length) {
        localStorage.setItem(SYMBOL_CACHE_KEY, JSON.stringify({ symbols: list, ts: Date.now() }))
        return list
      }
    } catch {}
    return ['005930.KS','000660.KS','035420.KS','035720.KS']
  }, [])

  const loadAndInitBySymbol = useCallback(async (sym: string) => {
    const r = await fetch(`/api/history?symbol=${encodeURIComponent(sym)}&range=2y&interval=1d`, { cache: 'no-store' })
    const { ohlc } = (await r.json()) as { ohlc: OHLC[] }
    setOhlc(ohlc)
    setSymbol(sym)

    const closes = ohlc.map(d => d.close)
    const startIndex = pickRandomStart(ohlc.length)

    g.init({
      symbol: sym,
      prices: closes,
      startIndex,
      maxTurns: 50,
      feeBps: g.feeBps ?? 5,
      slippageBps: g.slippageBps ?? 0,
    })

    // ★ 게임 시작(생명력 1 차감 + Game 생성)
    const resp = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym, startIndex, startCash: 10_000_000, feeBps: g.feeBps ?? 5, maxTurns: 50 }),
    })
    if (resp.ok) {
      const { gameId } = await resp.json()
      setGameId(gameId ?? null)
    } else {
      const j = await resp.json().catch(() => ({}))
      if (j?.error === 'NO_HEART') {
        alert('생명력이 부족합니다. 1시간마다 1개씩 충전됩니다.')
      } else {
        alert('게임 시작 중 오류가 발생했습니다.')
      }
    }

    setChartKey(k => k + 1)
  }, [g])

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    ;(async () => {
      const uni = await loadUniverse()
      universeRef.current = uni
      const chosen = pickRandom(uni)
      await loadAndInitBySymbol(chosen)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetGame = useCallback(async () => {
    let uni = universeRef.current
    if (!uni || uni.length === 0) {
      uni = await loadUniverse()
      universeRef.current = uni
    }
    const chosen = pickRandom(uni)
    await loadAndInitBySymbol(chosen)
  }, [loadAndInitBySymbol, loadUniverse])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (g.status !== 'playing') return
      const el = e.target as HTMLElement
      if (['INPUT','TEXTAREA'].includes(el?.tagName ?? '')) return
      const k = e.key.toLowerCase()
      if (k === 'a') g.buy(1)
      else if (k === 's') g.sell(1)
      else if (k === 'd' || k === ' ') g.next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [g])

  const last = g.prices[g.cursor]
  const { total } = useMemo(() => valuation(g.cash, g.shares, last), [g.cash, g.shares, last])
  const ret = useMemo(() => pnlPct(10_000_000, total), [total])

  const visible = useMemo(() => {
    if (!ohlc.length) return []
    const end = Math.min(g.cursor + 1, ohlc.length)
    return ohlc.slice(0, end)
  }, [ohlc, g.cursor])

  const fmt = (n?: number) => (n == null ? '-' : n.toLocaleString())
  const fmt2 = (n?: number) => (n == null ? '-' : n.toFixed(2))

  const trades = (g.history as unknown as Trade[])

  return (
    <div className="fixed left-0 right-0 bottom-0 top-[80px] overflow-hidden">
      <div className="h-full w-full flex justify-center items-start">
        <div className="h-full w-full max-w-[1800px]">
          <div className="grid h-full w-full gap-4 grid-cols-[minmax(0,1fr)_480px] p-4">
            {/* 좌: 차트 */}
            <div className="min-w-0">
              <Card className="p-3 h-full">
                <div className="mb-2 text-sm text-gray-500">
                  종목: <span className="font-semibold">{symbol || '로딩 중...'}</span>
                </div>
                <CandleChart
                  key={chartKey}
                  data={visible}
                  fullForMA={ohlc} 
                  height={chartH}
                  sma={[20, 50, 60, 120, 240]}
                  showLegend
                  showVolume
                />
              </Card>
            </div>

            {/* 우: 사이드 패널 */}
            <aside className="space-y-4 overflow-auto">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-600">
                    <span className="font-semibold">{String(g.turn + 1).padStart(2, '0')}</span>/{g.maxTurns}턴 · 일
                  </div>
                  <button onClick={() => g.end()} className="rounded-xl border px-4 py-2 text-base hover:bg-gray-50">게임 종료</button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button onClick={() => g.buy(1)} className="col-span-1 rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700">매수 (A)</button>
                  <button onClick={() => g.sell(1)} className="col-span-1 rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700">매도 (S)</button>
                  <button onClick={() => g.next()} className="col-span-1 rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black">다음 (D)</button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-gray-500">게임현황</div>
                <div className="mt-2 text-3xl font-bold">{fmt(total)} 원</div>
                <div className="text-sm text-gray-500">초기자산 10,000,000</div>
                <div className={`mt-1 font-semibold ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>수익률 {fmt2(ret)}%</div>

                <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">보유현금</div><div className="text-right">{fmt(g.cash)}</div>
                  <div className="text-gray-500">주식수</div><div className="text-right">{g.shares}</div>
                  <div className="text-gray-500">평단가</div><div className="text-right">{g.avgPrice ? Math.round(g.avgPrice).toLocaleString() : '-'}</div>
                  <div className="text-gray-500">현재가</div><div className="text-right">{last?.toLocaleString?.() ?? '-'}</div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="font-semibold">매매내역</div>
                <div className="mt-2 max-h-64 overflow-auto">
                  {trades.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">매매내역이 없습니다.</div>
                  ) : (
                    <ul className="space-y-2">
                      {trades.slice(0, 12).map((t, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className={t.side === 'BUY' ? 'text-red-600 font-semibold' : 'text-blue-600 font-semibold'}>
                            {t.side === 'BUY' ? '매수' : '매도'}
                          </span>
                          <span>{Math.round(t.price).toLocaleString()}</span>
                          <span className="text-gray-500">{t.qty}주</span>
                          <span className="text-gray-400">{new Date(t.time).toLocaleDateString('ko-KR')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <AdRecharge />
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {/* 종료 모달 */}
      {g.status === 'ended' && (
        <EndModal total={total} ret={ret} symbol={symbol} onRetry={resetGame} gameId={gameId} />
      )}
    </div>
  )
}

function EndModal({ total, ret, symbol, onRetry, gameId }:{
  total:number; ret:number; symbol:string; onRetry:()=>void; gameId: string | null
}) {
  const save = async () => {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, total, returnPct: ret, gameId }),
    })
    location.href = '/leaderboard'
  }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="w-[420px] rounded-2xl shadow-xl bg-white p-6">
        <div className="text-xl font-bold">게임 종료</div>
        <div className="mt-2">최종자산 {total.toLocaleString()}원 ({ret.toFixed(2)}%)</div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50" onClick={onRetry}>다시하기</button>
          <button className="rounded-xl bg-black text-white px-4 py-2 font-semibold" onClick={save}>기록 저장</button>
        </div>
      </div>
    </div>
  )
}
