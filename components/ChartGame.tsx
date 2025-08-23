'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import CandleChart from '@/components/CandleChart'
import { useGame } from '@/app/game/store/gameStore'
import { valuation, pnlPct } from '@/app/game/store/helpers'
import AdRecharge from '@/components/AdRecharge'
import OrderModal from '@/components/OrderModal'
import GameResultModal from '@/components/GameResultModal'
import { useUserStore } from '@/lib/store/user'
import { useRouter } from 'next/navigation'

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number }
type Trade = { side: 'BUY' | 'SELL'; price: number; qty: number; time: string }
type SymbolItem = { symbol: string; name: string; market: string }

const SYMBOL_CACHE_KEY_NAMES = 'kr_symbols_with_names_v1'
const SYMBOL_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12h
const MIN_VISIBLE = 365
const RESERVED_TURNS = 60
const MIN_TOTAL_CANDLES = MIN_VISIBLE + RESERVED_TURNS // 425
const CONCURRENCY = 8

async function validateSymbolWithHistory(item: SymbolItem): Promise<SymbolItem | null> {
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
}

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
  const router = useRouter()

  const [ohlc, setOhlc] = useState<OHLC[]>([])
  const [chartKey, setChartKey] = useState(0)
  const [symbolLabel, setSymbolLabel] = useState<string>('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [startCapital, setStartCapital] = useState<number>(0)
  const [orderType, setOrderType] = useState<null | 'buy' | 'sell'>(null)
  const [isGameEnd, setIsGameEnd] = useState(false)
  const [canPlay, setCanPlay] = useState(true) // ✅ 하트 부족 시 false
  

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

  // 하트 상태 및 setter (전역 Zustand store)
  const hearts = useUserStore(state => state.hearts)
  const setHearts = useUserStore(state => state.setHearts)

  // 단축키 (플레이 가능 & 진행중일 때만)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!canPlay || g.status !== 'playing') return
      const k = e.key.toLowerCase()
      if (k === 'a') setOrderType('buy')
      if (k === 's') setOrderType('sell')
      if (k === 'd') g.next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [g, canPlay])

  const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const loadUniverseWithNames = useCallback(async () => {
    const raw = localStorage.getItem(SYMBOL_CACHE_KEY_NAMES)
    if (raw) {
      const cached = JSON.parse(raw) as { symbols: SymbolItem[]; ts: number }
      if (cached?.symbols?.length && Date.now() - cached.ts < SYMBOL_CACHE_TTL_MS) {
        return cached.symbols
      }
    }

    const params = new URLSearchParams({
      names: 'true',
      excludeETF: 'true',
      excludeREIT: 'true',
      excludePreferred: 'true',
      gameOptimized: 'true',
      maxCount: '1500',
    })
    const r = await fetch(`/api/kr/symbols?${params}`, { cache: 'no-store' })
    const response = await r.json()
    const list = (response.symbols || []) as SymbolItem[]
    const valid = list.filter(s => /^\d{6}\.(KS|KQ)$/.test(s.symbol))

    const sample = valid.sort(() => Math.random() - 0.5).slice(0, 10)
    const checkedSample = await runWithConcurrency(sample, CONCURRENCY, validateSymbolWithHistory)
    const passed = checkedSample.filter((x): x is SymbolItem => !!x)

    if (passed.length > 0) {
      setTimeout(async () => {
        const checkedAll = await runWithConcurrency(valid, CONCURRENCY, validateSymbolWithHistory)
        const passedAll = checkedAll.filter((x): x is SymbolItem => !!x)
        if (passedAll.length) {
          localStorage.setItem(
            SYMBOL_CACHE_KEY_NAMES,
            JSON.stringify({ symbols: passedAll, ts: Date.now() }),
          )
        }
      }, 0)
      return passed
    }

    return [
      { symbol: '005930.KS', name: '삼성전자', market: '코스피' },
      { symbol: '000660.KS', name: 'SK하이닉스', market: '코스피' },
      { symbol: '035420.KS', name: 'NAVER', market: '코스피' },
      { symbol: '035720.KS', name: '카카오', market: '코스피' },
      { symbol: '247540.KQ', name: '에코프로비엠', market: '코스닥' },
      { symbol: '086520.KQ', name: '에코프로', market: '코스닥' },
    ]
  }, [])

  /**
   * 새 게임(초기화) 절차
   * 1) /api/me로 내 하트/자본 확인 → 0이면 알림 후 메인 이동
   * 2) /api/history 로 데이터 로드(아직 g.init 금지)
   * 3) /api/game/start 호출(서버에서 하트 차감) → OK일 때만 g.init
   */
  const loadAndInitBySymbol = useCallback(
    async (sym: string) => {
      // (1) 내 상태 확인
      let capital = 10_000_000
      let currentHearts: number | undefined = hearts
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          capital = me?.user?.capital ?? 10_000_000
          if (typeof me?.user?.hearts === 'number') {
            currentHearts = me.user.hearts
            setHearts(me.user.hearts)
            setCanPlay(me.user.hearts > 0)
          }
        }
      } catch {}
      setStartCapital(capital)

      if (!currentHearts || currentHearts <= 0) {
        setCanPlay(false)
        alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 🎁 광고 보고 지금 바로 무료 충전하세요!')
        router.push('/')            // ✅ 알림 후 메인 이동
        return
      }

      // (2) 차트 데이터 선로딩 (아직 g.init 금지)
      const r = await fetch(`/api/history?symbol=${encodeURIComponent(sym)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`, {
        cache: 'no-store',
      })
      const response = await r.json()
      const { ohlc, startIndex } = response
      setOhlc(ohlc)
      const closes = ohlc.map((d: any) => d.close)

      // (3) 서버에 게임 시작 요청 (여기서 하트 차감/검증)
      const resp = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 서버가 symbol 또는 code를 기대하는지에 맞춰주세요.
          // 현재 클라이언트는 symbol을 보내고 있음.
          symbol: sym,
          startIndex,
          startCash: capital,
          feeBps: g.feeBps ?? 5,
          maxTurns: RESERVED_TURNS,
        }),
      })

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        if (j?.error === 'NO_HEART') {
          setCanPlay(false)
          alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 🎁 광고 보고 지금 바로 무료 충전하세요!')
          router.push('/')          // ✅ 알림 후 메인 이동
          return
        }
        alert('게임 시작 중 오류가 발생했습니다.')
        return
      }

      const { gameId, hearts: serverHearts } = await resp.json()
      setGameId(gameId ?? null)
      if (typeof serverHearts === 'number') {
        setHearts(serverHearts)
        setCanPlay(serverHearts > 0)
      }

      // ✅ 서버 OK 후에만 실제 게임 시작
      g.init({
        symbol: sym,
        prices: closes,
        startIndex,
        maxTurns: RESERVED_TURNS,
        feeBps: g.feeBps ?? 5,
        slippageBps: g.slippageBps ?? 0,
        startCash: capital,
      })
      setChartKey(k => k + 1)
    },
    [g, setHearts, hearts, router]
  )

  // 최초 부팅: 하트 확인 → 0이면 알림 후 메인 이동, 아니면 새게임 진행
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true

    ;(async () => {
      let okHearts = hearts
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          const currentHearts = me?.user?.hearts ?? 0
          okHearts = currentHearts
          setHearts(currentHearts)
          setCanPlay(currentHearts > 0)
          setStartCapital(me?.user?.capital ?? 10_000_000)
        }
      } catch {}

      if (!okHearts || okHearts <= 0) {
        setCanPlay(false)
        alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 🎁 광고 보고 지금 바로 무료 충전하세요!')
        router.push('/')          // ✅ 알림 후 메인 이동
        return
      }

      const uni = await loadUniverseWithNames()
      universeRef.current = uni
      const chosen = pickRandom<SymbolItem>(uni)
      await loadAndInitBySymbol(chosen.symbol)
      setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ 새 게임(차트 변경): 하트 없으면 알림 후 메인 이동. 하트 차감은 /api/game/start에서 처리.
  const resetGame = useCallback(async () => {
    if (!hearts || hearts <= 0) {
      setCanPlay(false)
      alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 🎁 광고 보고 지금 바로 무료 충전하세요!')
      router.push('/')            // ✅ 확인 후 메인 이동
      return
    }

    let uni = universeRef.current
    if (!uni || uni.length === 0) {
      uni = await loadUniverseWithNames()
      universeRef.current = uni
    }
    const chosen = pickRandom<SymbolItem>(uni)
    await loadAndInitBySymbol(chosen.symbol)
    setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
  }, [hearts, loadUniverseWithNames, loadAndInitBySymbol, router])

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

  const endCapital = total
  const finalReturnPct = ret
  const finalIndex = g.cursor

  // 1) 서버에 게임 종료/정산 요청 → User.capital 동기화
  try {
    if (gameId) {
      await fetch('/api/game/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          finalCapital: endCapital,   // ✅ 네 finish 라우트가 받는 키
          returnPct: finalReturnPct,  // ✅ 동일
          symbol: g.symbol,           // Score 저장용 (finish 라우트에서 사용)
          endIndex: finalIndex,       // 선택(기록용)
        }),
      })
    }
  } catch (e) {
    console.error('finish API error', e)
  }

  // 2) (선택) 순위 불러오기
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

  // 3) 결과 모달 오픈
  setResult({
    startCapital,
    endCapital,
    profit: endCapital - startCapital,
    profitRate: finalReturnPct,
    tax: 0,
    tradeCount: g.history.length,
    turnCount: g.turn + 1,
    heartsLeft: hearts ?? 0,
    rank,
    prevRank,
  })
  setIsGameEnd(true)
  g.end()
}, [gameId, startCapital, total, ret, g.history.length, g.turn, g, hearts])


  const fmt = (n?: number) => (n == null ? '-' : Math.round(n).toLocaleString())

  const trades: Trade[] = useMemo(() => {
    const visibleTimes = new Set(
      ohlc.slice(0, g.cursor + 1).map(d => {
        return typeof d.time === 'number'
          ? d.time > 1e12
            ? Math.floor(d.time / 1000)
            : d.time
          : Math.floor(new Date(d.time).getTime() / 1000)
      }),
    )
    return (g.history as Trade[]).filter(t => {
      const tradeTime =
        typeof (t as any).time === 'number'
          ? (t as any).time > 1e12
            ? Math.floor((t as any).time / 1000)
            : (t as any).time
          : Math.floor(new Date((t as any).time).getTime() / 1000)
      return visibleTimes.has(tradeTime)
    })
  }, [ohlc, g.cursor, g.history])

  const handleOrderSubmit = (qty: number) => {
    if (!canPlay || g.status !== 'playing') return
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

  return (
    <div className="fixed left-0 right-0 bottom-0 top-[80px] overflow-hidden">
      <div className="h-full w-full flex justify-center items-start">
        <div className="h-full w-full max-w-[1800px]">
          <div className="grid h-full w-full gap-4 grid-cols-[minmax(0,1fr)_480px] p-4">
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

            <aside className="space-y-4 overflow-auto">
              <AdRecharge />

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-600">
                    <span className="font-semibold">{String(g.turn + 1).padStart(2, '0')}</span>/{g.maxTurns}턴 · 일
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={resetGame} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
                      차트 변경
                    </button>
                    <button
                      onClick={() => (g.status === 'playing' ? endGame() : router.push('/'))}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      게임 종료
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setOrderType('buy')}
                    disabled={g.status !== 'playing' || !canPlay}
                    className="col-span-1 rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    매수 (A)
                  </button>
                  <button
                    onClick={() => setOrderType('sell')}
                    disabled={g.status !== 'playing' || !canPlay}
                    className="col-span-1 rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    매도 (S)
                  </button>
                  <button
                    onClick={() => g.next()}
                    disabled={g.status !== 'playing' || !canPlay}
                    className="col-span-1 rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
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
            </aside>
          </div>
        </div>
      </div>

      {isGameEnd && result && (
        <GameResultModal
          isOpen={isGameEnd}
          onClose={() => {
            setIsGameEnd(false)
            router.push('/')   // ✅ 닫기 누르면 메인 이동
          }}
          result={result}
        />
      )}

      {orderType && (
        <OrderModal
          type={orderType}
          currentPrice={g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0}
          maxShares={orderType === 'buy' ? Math.floor(g.cash / ((g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0) || 1)) : g.shares}
          onClose={() => setOrderType(null)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </div>
  )
}
