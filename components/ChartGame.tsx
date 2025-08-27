'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import CandleChart from '@/components/CandleChart'
import { useGame } from '@/game/store/gameStore'
import { valuation, pnlPct } from '@/game/store/helpers'
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
  const [canPlay, setCanPlay] = useState(true)

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

  // 하트 상태
  const hearts = useUserStore(state => state.hearts)
  const setHearts = useUserStore(state => state.setHearts)

  // ================================
  // 진행상태 저장 API (스냅샷)
  // ================================
  const saveProgress = useCallback(async () => {
    if (!gameId) return
    const last = g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0
    const equity = g.cash + g.shares * last

    await fetch('/api/game/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        ts: g.cursor,
        cash: g.cash,
        shares: g.shares,
        equity,
        turn: g.turn,         // 추가
        avgPrice: g.avgPrice, // 추가
        history: g.history,   // 추가
      }),
    }).catch(() => {})
  }, [gameId, g.cursor, g.cash, g.shares, g.prices, g.turn, g.avgPrice, g.history])

  // beforeunload 핸들러도 동일하게 저장
  useEffect(() => {
    const handler = () => {
      try {
        const last = g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0
        const equity = g.cash + g.shares * last
        navigator.sendBeacon?.(
          '/api/game/progress',
          new Blob(
            [
              JSON.stringify({
                gameId,
                ts: g.cursor,
                cash: g.cash,
                shares: g.shares,
                equity,
                turn: g.turn,
                avgPrice: g.avgPrice,
                history: g.history,
              }),
            ],
            { type: 'application/json' }
          )
        )
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gameId, g.cursor, g.cash, g.shares, g.prices, g.turn, g.avgPrice, g.history])

  // 단축키 (A/S/D + R)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!canPlay || g.status !== 'playing') return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) return

      const k = e.key.toLowerCase()
      if (k === 'a') setOrderType('buy')
      if (k === 's') setOrderType('sell')
      if (k === 'd') {
        g.next()
        void saveProgress()
      }
      if (k === 'r') {
        if ((useGame.getState().chartChangesLeft ?? 0) > 0) {
          void resetGame()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [g, canPlay, saveProgress])

  const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * Math.random() * arr.length)]

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
          localStorage.setItem(SYMBOL_CACHE_KEY_NAMES, JSON.stringify({ symbols: passedAll, ts: Date.now() }))
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
   * 차트 로딩 + 초기화
   * consumeHeart=true: 새 게임 시작 (/api/game/start 호출, 하트 차감, chartChangesLeft=3으로 리셋)
   * consumeHeart=false: 차트만 변경 (하트 비소모, 서버 호출 없음, chartChangesLeft만 1 감소)
   */
  const loadAndInitBySymbol = useCallback(
    async (sym: string, opts?: { consumeHeart?: boolean }) => {
      const consumeHeart = opts?.consumeHeart !== false // 기본 true

      // (1) 내 상태 확인
      let capital = 10_000_000
      let currentHearts: number | undefined = hearts

      if (consumeHeart) {
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
          router.push('/')
          return
        }
      } else {
        // 하트 비소모: capital만 동기화 (하트 체크/차감 없음)
        try {
          const meRes = await fetch('/api/me', { cache: 'no-store' })
          if (meRes.ok) {
            const me = await meRes.json()
            capital = me?.user?.capital ?? 10_000_000
            if (typeof me?.user?.hearts === 'number') {
              setHearts(me.user.hearts)
            }
          }
        } catch {}
        setStartCapital(capital)
      }

      // (2) 차트 데이터
      const r = await fetch(
        `/api/history?symbol=${encodeURIComponent(sym)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`,
        { cache: 'no-store' }
      )
      const response = await r.json()
      const { ohlc, startIndex } = response
      setOhlc(ohlc)
      const closes = ohlc.map((d: any) => d.close)

      if (consumeHeart) {
        // (3-A) 새 게임 시작: 서버에 시작 보고(하트 차감)
        const resp = await fetch('/api/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: sym,
            startIndex,
            startCash: capital,
            feeBps: g.feeBps ?? 5,
            maxTurns: RESERVED_TURNS,
            forceNew: true,
          }),
        })

        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}))
          if (j?.error === 'NO_HEART') {
            setCanPlay(false)
            alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 🎁 광고 보고 지금 바로 무료 충전하세요!')
            router.push('/')
            return
          }
          alert('게임 시작 중 오류가 발생했습니다.')
          return
        }

        const data = await resp.json()
        setGameId(data?.gameId ?? null)
        if (typeof data?.hearts === 'number') {
          setHearts(data.hearts)
          setCanPlay(data.hearts > 0)
        }

        // 새 게임 시작 시 차트변경 3회로 리셋
        useGame.setState({ chartChangesLeft: 3 })
      } else {
        // (3-B) 차트변경: 서버 호출/하트 차감 없음
        // gameId는 유지 (없으면 finish 보고만 스킵)
      }

      // 공통 init
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

  // 부팅: 이어하기 먼저 시도 → 실패 시 새 게임
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true

    ;(async () => {
      // 0) 내 정보 동기화
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          const currentHearts = me?.user?.hearts ?? 0
          setHearts(currentHearts)
          setCanPlay(currentHearts > 0)
          setStartCapital(me?.user?.capital ?? 10_000_000)
        }
      } catch {}

      // 1) 이어하기
      try {
        const r = await fetch('/api/game/current', { cache: 'no-store' })
        if (r.ok) {
          const data = await r.json()
          if (data?.game) {
            const ginfo = data.game as {
              id: string
              symbol: string
              startCash: number
              startIndex: number
              maxTurns: number
              feeBps: number
              snapshot: null | {
                cursor: number
                cash: number
                shares: number
                turn?: number
                avgPrice?: number | null
                history?: Trade[]
              }
            }

            // 차트 로딩
            const hist = await fetch(
              `/api/history?symbol=${encodeURIComponent(ginfo.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`,
              { cache: 'no-store' }
            )
            const hjson = await hist.json()
            const ohlcArr: OHLC[] = hjson.ohlc
            setOhlc(ohlcArr)
            setSymbolLabel(`${ginfo.symbol}`)
            setGameId(ginfo.id)
            setStartCapital(ginfo.startCash)

            const closes = ohlcArr.map(d => d.close)
            g.init({
              symbol: ginfo.symbol,
              prices: closes,
              startIndex: ginfo.startIndex,
              maxTurns: ginfo.maxTurns ?? RESERVED_TURNS,
              feeBps: ginfo.feeBps ?? (g.feeBps ?? 5),
              slippageBps: g.slippageBps ?? 0,
              startCash: ginfo.startCash,
            })

            if (ginfo.snapshot) {
              ;(g as any).setCursor?.(ginfo.snapshot.cursor)
              ;(g as any).setCash?.(ginfo.snapshot.cash)
              ;(g as any).setShares?.(ginfo.snapshot.shares)

              // 확장 필드 복원
              useGame.setState({
                turn:
                  typeof ginfo.snapshot.turn === 'number' ? ginfo.snapshot.turn : g.turn,
                avgPrice:
                  typeof ginfo.snapshot.avgPrice === 'number' || ginfo.snapshot.avgPrice === null
                    ? ginfo.snapshot.avgPrice
                    : g.avgPrice,
                history: Array.isArray(ginfo.snapshot.history) ? ginfo.snapshot.history : [],
              })
            }

            setChartKey(k => k + 1)
            return // 이어하기 성공 → 종료
          }
        }
      } catch {
        // 이어하기 실패 시 무시
      }

      // 2) 이어할 게임이 없으면 새 게임 시작 (하트 차감, 3회 리셋)
      let uni = universeRef.current
      if (!uni || uni.length === 0) {
        uni = await loadUniverseWithNames()
        universeRef.current = uni
      }
      const chosen = pickRandom<SymbolItem>(uni)
      await loadAndInitBySymbol(chosen.symbol, { consumeHeart: true })
      setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 상태 변경 시 살짝 디바운스해서 자동 저장
  useEffect(() => {
    const id = setTimeout(() => {
      void saveProgress()
    }, 150)
    return () => clearTimeout(id)
  }, [g.cursor, g.cash, g.shares, g.turn, g.avgPrice, g.history, saveProgress])

  // 차트변경 (하트 소모 없음, 3회 제한)
  const resetGame = useCallback(async () => {
    // 남은 횟수 체크
    if ((useGame.getState().chartChangesLeft ?? 0) <= 0) {
      alert('차트변경 가능 횟수를 모두 사용했습니다. (최대 3회)')
      return
    }

    let uni = universeRef.current
    if (!uni || uni.length === 0) {
      uni = await loadUniverseWithNames()
      universeRef.current = uni
    }
    const chosen = pickRandom<SymbolItem>(uni)

    // 하트 소모 없이 차트만 다시
    await loadAndInitBySymbol(chosen.symbol, { consumeHeart: false })
    setSymbolLabel(`${chosen.name} (${chosen.symbol})`)

    // 횟수 차감
    useGame.getState().decChartChanges()
  }, [loadUniverseWithNames, loadAndInitBySymbol])

  const last = g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0
  const { total } = useMemo(() => valuation(g.cash, g.shares, last), [g.cash, g.shares, last])
  const ret = useMemo(() => pnlPct(startCapital || 1, Math.round(total)), [startCapital, total])

  useEffect(() => {
    if (g.turn + 1 >= g.maxTurns && g.status === 'playing') {
      endGame()
    }
  }, [g.turn, g.maxTurns, g.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const endGame = useCallback(async () => {
    let rank: number | null = null
    let prevRank: number | null = null

    const endCapital = total
    const finalReturnPct = ret
    const finalIndex = g.cursor

    try {
      if (gameId) {
        await fetch('/api/game/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            finalCapital: endCapital,
            returnPct: finalReturnPct,
            symbol: (g as any).symbol,
            endIndex: finalIndex,
          }),
        })
      }
    } catch (e) {
      console.error('finish API error', e)
    }

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
      })
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

  const handleOrderSubmit = async (qty: number) => {
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

    await saveProgress()
  }

  const chartChangesLeft = useGame(state => state.chartChangesLeft ?? 0)

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
                    <button
                      onClick={resetGame}
                      disabled={chartChangesLeft <= 0}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        chartChangesLeft > 0 ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                      }`}
                      title="하트 소모 없이 차트만 변경합니다. (단축키: R)"
                    >
                      차트 변경 (R) ×{chartChangesLeft}
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
                    onClick={async () => {
                      g.next()
                      await saveProgress()
                    }}
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
                <div className="text-sm text-gray-500">현재 자산 {fmt(startCapital)}</div>
                <div className={`mt-1 font-semibold ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  수익률 {ret.toFixed(2)}%
                </div>

                <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">보유 현금</div>
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
            router.push('/') // 닫기 → 메인 이동
          }}
          result={result}
        />
      )}

      {orderType && (
        <OrderModal
          type={orderType}
          currentPrice={g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0}
          maxShares={
            orderType === 'buy'
              ? Math.floor(g.cash / ((g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0) || 1))
              : g.shares
          }
          onClose={() => setOrderType(null)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </div>
  )
}

