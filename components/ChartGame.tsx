'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import CandleChart from '@/components/CandleChart'
import { useGame } from '@/app/game/store/gameStore'
import { valuation, pnlPct } from '@/app/game/store/helpers'
import AdRecharge from '@/components/AdRecharge'
import OrderModal from '@/components/OrderModal'
import GameResultModal from '@/components/GameResultModal'

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number }
type Trade = { side: 'BUY' | 'SELL'; price: number; qty: number; time: string }
type SymbolItem = { symbol: string; name: string; market: string }

// 캐시
const SYMBOL_CACHE_KEY_NAMES = 'kr_symbols_with_names_v1'
const SYMBOL_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12h

// 최소 필요 캔들수: 기본 365 + 숨김 60
const MIN_VISIBLE = 365
const RESERVED_TURNS = 60
const MIN_TOTAL_CANDLES = MIN_VISIBLE + RESERVED_TURNS // 425

// 히스토리 검증 동시성
const CONCURRENCY = 8

// 간단한 동시성 러너
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
}

export default function ChartGame() {
  const g = useGame()
  const [ohlc, setOhlc] = useState<OHLC[]>([])
  const [chartKey, setChartKey] = useState(0)
  const [symbolLabel, setSymbolLabel] = useState<string>('') // 화면표시: "삼성전자 (005930.KS)"
  const [gameId, setGameId] = useState<string | null>(null)
  const [startCapital, setStartCapital] = useState<number>(0)
  const [orderType, setOrderType] = useState<null | 'buy' | 'sell'>(null)
  const [isGameEnd, setIsGameEnd] = useState(false)
  const [result, setResult] = useState<null | {
    startCapital: number
    endCapital: number
    profit: number
    profitRate: number
    tax: number
    tradeCount: number
    turnCount: number
    heartsLeft: number
    rank: number | null
    prevRank: number | null
  }>(null)

  const universeRef = useRef<SymbolItem[]>([])
  const bootedRef = useRef(false)

  // 단축키
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'a') setOrderType('buy')
      if (k === 's') setOrderType('sell')
      if (k === 'd') g.next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [g])

  const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

  // names=true 종목 로더 (+히스토리 길이 검증)
  const loadUniverseWithNames = useCallback(async (): Promise<SymbolItem[]> => {
    try {
      // 1) 캐시 체크
      const raw = localStorage.getItem(SYMBOL_CACHE_KEY_NAMES)
      if (raw) {
        const cached = JSON.parse(raw) as { symbols: SymbolItem[]; ts: number }
        if (cached?.symbols?.length && Date.now() - cached.ts < SYMBOL_CACHE_TTL_MS) {
          console.log(`[symbols] cached: ${cached.symbols.length}`)
          return cached.symbols
        }
      }

      // 2) 후보군 가져오기 (여기서 1개만 가져오면 안됨!)
      console.log('[symbols] fetching list...')
      const params = new URLSearchParams({
        names: 'true',
        excludeETF: 'true',
        excludeREIT: 'true',
        excludePreferred: 'true',
        gameOptimized: 'true',
        
        maxCount: '1500', 
      })
      const r = await fetch(`/api/kr/symbols?${params}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`symbols API ${r.status}`)
      const response = await r.json()
      const list = (response.symbols || []) as SymbolItem[]
      if (!list.length) throw new Error('no symbols')

      // 3) 심볼 포맷 검증
      const valid = list.filter(s => /^\d{6}\.(KS|KQ)$/.test(s.symbol))
      if (!valid.length) throw new Error('no valid symbols')

      console.log(`[symbols] candidates: ${valid.length} → history check (>= ${MIN_TOTAL_CANDLES})`)

      // 4) 히스토리 길이 검증 (동시성 제한)
      const checked = await runWithConcurrency(valid, CONCURRENCY, async (item) => {
        try {
          const url = `/api/history?symbol=${encodeURIComponent(item.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) return null
          const json = await res.json()
          const total: number = Number(json?.meta?.totalAvailableData ?? json?.ohlc?.length ?? 0)
          return total >= MIN_TOTAL_CANDLES ? item : null
        } catch {
          return null
        }
      })

      const passed = checked.filter((x): x is SymbolItem => !!x)
      if (!passed.length) throw new Error('no symbols passed history requirement')

      console.log(`[symbols] passed: ${passed.length}`)

      // 5) 캐시 저장
      localStorage.setItem(SYMBOL_CACHE_KEY_NAMES, JSON.stringify({ symbols: passed, ts: Date.now() }))
      return passed
    } catch (e) {
      console.error('loadUniverseWithNames failed:', e)
      // 폴백
      return [
        { symbol: '005930.KS', name: '삼성전자', market: '코스피' },
        { symbol: '000660.KS', name: 'SK하이닉스', market: '코스피' },
        { symbol: '035420.KS', name: 'NAVER', market: '코스피' },
        { symbol: '035720.KS', name: '카카오', market: '코스피' },
        { symbol: '247540.KQ', name: '에코프로비엠', market: '코스닥' },
        { symbol: '086520.KQ', name: '에코프로', market: '코스닥' },
      ]
    }
  }, [])

  // 심볼 로딩/초기화
  const loadAndInitBySymbol = useCallback(async (sym: string) => {
    let capital = 10_000_000
    try {
      const meRes = await fetch('/api/me', { cache: 'no-store' })
      if (meRes.ok) {
        const me = await meRes.json()
        capital = me?.user?.capital ?? 10_000_000
      }
    } catch {}
    setStartCapital(capital)

    const r = await fetch(`/api/history?symbol=${encodeURIComponent(sym)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`, {
      cache: 'no-store',
    })
    const response = await r.json()
    const { ohlc, startIndex, initialChart, meta } = response

    setOhlc(ohlc)

    const closes = ohlc.map((d: any) => d.close)

    console.log('게임 정보:', {
      symbol: sym,
      totalData: ohlc.length,
      startIndex,
      initialChartDays: initialChart.length,
      dateRange: `${meta.sliceStart} ~ ${meta.sliceEnd}`,
      totalAvailable: meta.totalAvailableData,
    })

    g.init({
      symbol: sym,
      prices: closes,
      startIndex,
      maxTurns: RESERVED_TURNS,
      feeBps: g.feeBps ?? 5,
      slippageBps: g.slippageBps ?? 0,
      startCash: capital,
    })

    const resp = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: sym,
        startIndex,
        startCash: capital,
        feeBps: g.feeBps ?? 5,
        maxTurns: RESERVED_TURNS,
      }),
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

    setChartKey((k) => k + 1)
  }, [g])

  // 최초 로딩
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    ;(async () => {
      const uni = await loadUniverseWithNames()
      universeRef.current = uni
      const chosen = pickRandom<SymbolItem>(uni)
      await loadAndInitBySymbol(chosen.symbol)
      setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
    })()
  }, [loadUniverseWithNames, loadAndInitBySymbol])

  // 새 랜덤 게임
  const resetGame = useCallback(async () => {
    let uni = universeRef.current
    if (!uni || uni.length === 0) {
      uni = await loadUniverseWithNames()
      universeRef.current = uni
    }
    const chosen = pickRandom<SymbolItem>(uni)
    await loadAndInitBySymbol(chosen.symbol)
    setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
  }, [loadAndInitBySymbol, loadUniverseWithNames])

  // 게임 진행
  const last = g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0
  const { total } = useMemo(() => valuation(g.cash, g.shares, last), [g.cash, g.shares, last])
  const ret = useMemo(() => pnlPct(startCapital || 1, Math.round(total)), [startCapital, total])

  useEffect(() => {
    if (g.turn + 1 >= g.maxTurns && g.status === 'playing') {
      endGame()
    }
  }, [g.turn, g.maxTurns, g.status])

  const endGame = useCallback(async () => {
    let rank: number | null = null
    let prevRank: number | null = null

    try {
      const res = await fetch('/api/leaderboard?period=7d', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.myRank) {
          rank = data.myRank.rank ?? null
          prevRank = null
        }
      }
    } catch (e) {
      console.error('순위 불러오기 실패:', e)
    }

    setResult({
      startCapital,
      endCapital: total,
      profit: total - startCapital,
      profitRate: ret,
      tax: 0,
      tradeCount: g.history.length,
      turnCount: g.turn + 1,
      heartsLeft: 4,
      rank,
      prevRank,
    })
    setIsGameEnd(true)
    g.end()
  }, [startCapital, total, ret, g.history.length, g.turn, g])

  // UI 데이터
  const fmt = (n?: number) => (n == null ? '-' : Math.round(n).toLocaleString())

  const trades: Trade[] = useMemo(() => {
    const visibleTimes = new Set(
      ohlc.slice(0, g.cursor + 1).map((d) => {
        return typeof d.time === 'number'
          ? d.time > 1e12
            ? Math.floor(d.time / 1000)
            : d.time
          : Math.floor(new Date(d.time).getTime() / 1000)
      })
    )
    return (g.history as Trade[]).filter((t) => {
      const tradeTime =
        typeof t.time === 'number'
          ? t.time > 1e12
            ? Math.floor(t.time / 1000)
            : t.time
          : Math.floor(new Date(t.time).getTime() / 1000)
      return visibleTimes.has(tradeTime)
    })
  }, [ohlc, g.cursor, g.history])

  const maxBuyShares = Math.floor(g.cash / (last || 1))
  const maxSellShares = g.shares

  const handleOrderSubmit = (qty: number) => {
    const currentOhlc = ohlc[g.cursor]
    const tradeTime =
      typeof currentOhlc.time === 'number'
        ? currentOhlc.time > 1e12
          ? Math.floor(currentOhlc.time / 1000)
          : currentOhlc.time
        : Math.floor(new Date(currentOhlc.time).getTime() / 1000)

    if (orderType === 'buy') g.buy(qty, tradeTime)
    if (orderType === 'sell') g.sell(qty, tradeTime)
  }

  // 렌더
  return (
    <div className="fixed left-0 right-0 bottom-0 top-[80px] overflow-hidden">
      <div className="h-full w-full flex justify-center items-start">
        <div className="h-full w-full max-w-[1800px]">
          <div className="grid h-full w-full gap-4 grid-cols-[minmax(0,1fr)_480px] p-4">
            {/* 좌: 차트 */}
            <div className="min-w-0">
              <Card className="p-3 h-full">
                <div className="mb-2 text-sm text-gray-500">
                  종목: <span className="font-semibold">{symbolLabel || '로딩 중...'}</span>
                </div>
                <CandleChart
                  key={chartKey}
                  data={ohlc.slice(0, g.cursor + 1)}
                  fullForMA={ohlc}
                  height={720}
                  sma={[5, 10, 20, 60, 120, 240]}
                  showLegend
                  showVolume
                  trades={trades}
                />
              </Card>
            </div>

            {/* 우: 사이드 패널 */}
            <aside className="space-y-4 overflow-auto">
              <AdRecharge />
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-600">
                    <span className="font-semibold">{String(g.turn + 1).padStart(2, '0')}</span>/{g.maxTurns}턴 · 일
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={resetGame} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
                      새 종목
                    </button>
                    <button onClick={endGame} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
                      게임 종료
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setOrderType('buy')}
                    className="col-span-1 rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700"
                  >
                    매수 (A)
                  </button>
                  <button
                    onClick={() => setOrderType('sell')}
                    className="col-span-1 rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700"
                  >
                    매도 (S)
                  </button>
                  <button
                    onClick={() => g.next()}
                    className="col-span-1 rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black"
                  >
                    다음 (D)
                  </button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-gray-500">게임현황</div>
                <div className="mt-2 text-3xl font-bold">{fmt(total)} 원</div>
                <div className="text-sm text-gray-500">초기자산 {fmt(startCapital)}</div>
                <div className={`mt-1 font-semibold ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>수익률 {ret.toFixed(2)}%</div>

                <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">보유현금</div>
                  <div className="text-right">{fmt(g.cash)}</div>
                  <div className="text-gray-500">주식수</div>
                  <div className="text-right">{fmt(g.shares)}</div>
                  <div className="text-gray-500">평단가</div>
                  <div className="text-right">{g.avgPrice ? fmt(g.avgPrice) : '-'}</div>
                  <div className="text-gray-500">현재가</div>
                  <div className="text-right">{last != null ? fmt(last) : '-'}</div>
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
                          <span>{fmt(Math.round(t.price))}</span>
                          <span className="text-gray-500">{fmt(t.qty)}주</span>
                          <span className="text-gray-400">{new Date(t.time).toLocaleDateString('ko-KR')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {isGameEnd && result && (
        <GameResultModal
          isOpen={isGameEnd}
          onClose={() => {
            setIsGameEnd(false)
            resetGame()
          }}
          result={result}
        />
      )}

      {orderType && (
        <OrderModal
          type={orderType}
          currentPrice={last || 0}
          maxShares={orderType === 'buy' ? Math.floor(g.cash / (last || 1)) : g.shares}
          onClose={() => setOrderType(null)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </div>
  )
}
