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

// ---------- OHLC 캐시(심볼+startIndex 기준) ----------
const LS_OHLC_KEY = 'chartgame_ohlc_cache_v1'
type OhlcCache = Record<string, OHLC[]>
const ohlcKey = (symbol: string, startIndex: number) => `${symbol}__${startIndex}__${MIN_VISIBLE}__${RESERVED_TURNS}`
function readOhlcFromCache(symbol: string, startIndex: number): OHLC[] | null {
  try {
    const raw = localStorage.getItem(LS_OHLC_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as OhlcCache
    return map[ohlcKey(symbol, startIndex)] ?? null
  } catch { return null }
}
function writeOhlcToCache(symbol: string, startIndex: number, data: OHLC[]) {
  try {
    const raw = localStorage.getItem(LS_OHLC_KEY)
    const map: OhlcCache = raw ? JSON.parse(raw) : {}
    map[ohlcKey(symbol, startIndex)] = data
    localStorage.setItem(LS_OHLC_KEY, JSON.stringify(map))
  } catch {}
}

// ---------- 이어하기용 로컬 스냅 ----------
const LS_KEY = 'chartgame_current_v3'
type LocalMeta = {
  id: string | null
  symbol: string
  startIndex: number
  maxTurns: number
  feeBps: number
  slippageBps: number
  startCash: number
  chartChangesLeft: number
}
type LocalSnap = {
  cursor: number
  cash: number
  shares: number
  turn: number
  avgPrice: number | null
  history: Trade[]
  ts?: number
}
type LocalState = { meta: LocalMeta; snap: LocalSnap }
function readLocal(): LocalState | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
function writeLocal(meta: LocalMeta, snap: LocalSnap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ meta, snap: { ...snap, ts: Date.now() } })) } catch {}
}
function clearLocal() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

// ---------- 유틸 ----------
async function validateSymbolWithHistory(item: SymbolItem): Promise<SymbolItem | null> {
  try {
    const url = `/api/history?symbol=${encodeURIComponent(item.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const total: number = Number(json?.meta?.totalAvailableData ?? json?.ohlc?.length ?? 0)
    return total >= MIN_TOTAL_CANDLES ? item : null
  } catch { return null }
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
function maxBuyableShares(cash: number, lastRaw: number, feeBps: number, slipBps: number) {
  if (!lastRaw || lastRaw <= 0) return 0
  const unitCost = lastRaw * (1 + (slipBps ?? 0) / 10000) * (1 + (feeBps ?? 0) / 10000)
  if (unitCost <= 0) return 0
  return Math.floor(cash / unitCost)
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
  const nextLockRef = useRef(false)
  const restoringRef = useRef(true)

  const hearts = useUserStore(state => state.hearts)
  const setHearts = useUserStore(state => state.setHearts)

  // 저장(서버+로컬)
  const saveProgress = useCallback(async () => {
    const symbol = (g as any).symbol
    const ready =
      g.status === 'playing' &&
      !restoringRef.current &&
      symbol &&
      typeof symbol === 'string' &&
      symbol.length > 0 &&
      Array.isArray(g.prices) &&
      g.prices.length > 0
    if (!ready) return

    const last = g.prices[g.cursor] != null ? Math.round(g.prices[g.cursor]) : 0
    const equity = g.cash + g.shares * last

    if (gameId) {
      await fetch('/api/game/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          ts: g.cursor,
          cursor: g.cursor,
          cash: g.cash,
          shares: g.shares,
          equity,
          turn: g.turn,
          avgPrice: g.avgPrice,
          history: g.history,
        }),
      }).catch(() => {})
    }

    const meta: LocalMeta = {
      id: gameId ?? null,
      symbol,
      startIndex: g.startIndex ?? 0,
      maxTurns: g.maxTurns ?? RESERVED_TURNS,
      feeBps: g.feeBps ?? 5,
      slippageBps: g.slippageBps ?? 0,
      startCash: startCapital || 10_000_000,
      chartChangesLeft: useGame.getState().chartChangesLeft ?? 0,
    }
    const snap: LocalSnap = {
      cursor: g.cursor,
      cash: g.cash,
      shares: g.shares,
      turn: g.turn,
      avgPrice: g.avgPrice,
      history: g.history as Trade[],
    }
    writeLocal(meta, snap)
  }, [gameId, g.status, g.cursor, g.cash, g.shares, g.turn, g.avgPrice, g.history, g.prices, g.maxTurns, g.feeBps, g.slippageBps, g.startIndex, startCapital])

  // 이탈/가림에도 저장
  useEffect(() => {
    const onBeforeUnload = () => { try { void saveProgress() } catch {} }
    const onVis = () => { if (document.visibilityState === 'hidden') { try { void saveProgress() } catch {} } }
    const onHide = () => { try { void saveProgress() } catch {} }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
    }
  }, [saveProgress])

  // 상태 자동 저장
  useEffect(() => {
    const id = setTimeout(() => { void saveProgress() }, 120)
    return () => clearTimeout(id)
  }, [g.cursor, g.cash, g.shares, g.turn, g.avgPrice, g.history, saveProgress])

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
   * consumeHeart=true: 새 게임 시작 (하트 차감, chartChangesLeft=3)
   * consumeHeart=false: 차트만 변경 (하트 비소모)
   */
  const loadAndInitBySymbol = useCallback(
    async (sym: string, opts?: { consumeHeart?: boolean }) => {
      const consumeHeart = opts?.consumeHeart !== false
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

      // 새 게임용 히스토리 호출 (여기는 서버가 startIndex를 정해서 내려줌)
      const r = await fetch(
        `/api/history?symbol=${encodeURIComponent(sym)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`,
        { cache: 'no-store' }
      )
      const response = await r.json()
      const { ohlc: ohlcResp, startIndex: startIndexResp } = response as { ohlc: OHLC[]; startIndex: number }
      setOhlc(ohlcResp)
      writeOhlcToCache(sym, startIndexResp, ohlcResp) // ★ 캐시
      const closes = ohlcResp.map((d: any) => d.close)

      if (consumeHeart) {
        const resp = await fetch('/api/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: sym,
            startIndex: startIndexResp, // ★ 서버에도 동일 startIndex 보고
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
        useGame.setState({ chartChangesLeft: 3 })
      }

      // init
      g.init({
        symbol: sym,
        prices: closes,
        startIndex: startIndexResp,
        maxTurns: RESERVED_TURNS,
        feeBps: g.feeBps ?? 5,
        slippageBps: g.slippageBps ?? 0,
        startCash: capital,
      })

      // 로컬 메타/스냅 기본값 기록
      writeLocal(
        {
          id: gameId ?? null,
          symbol: sym,
          startIndex: startIndexResp,
          maxTurns: RESERVED_TURNS,
          feeBps: g.feeBps ?? 5,
          slippageBps: g.slippageBps ?? 0,
          startCash: capital,
          chartChangesLeft: useGame.getState().chartChangesLeft ?? 3,
        },
        {
          cursor: startIndexResp,
          cash: Math.floor(capital),
          shares: 0,
          turn: 0,
          avgPrice: null,
          history: [],
        }
      )

      setChartKey(k => k + 1)
      restoringRef.current = false
    },
    [g, setHearts, hearts, router, gameId]
  )

  // 차트변경(하트 비소모)
  const resetGame = useCallback(async () => {
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
    restoringRef.current = true
    await loadAndInitBySymbol(chosen.symbol, { consumeHeart: false })
    setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
    useGame.getState().decChartChanges()

    const local = readLocal()
    if (local) {
      writeLocal(
        { ...local.meta, chartChangesLeft: useGame.getState().chartChangesLeft ?? 0 },
        local.snap
      )
    }
    restoringRef.current = false
  }, [loadUniverseWithNames, loadAndInitBySymbol])

  // 단축키 (A/S/D + R) + D 연타 보호
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!canPlay || g.status !== 'playing') return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) return
      if ((e as any).repeat) return

      const k = e.key.toLowerCase()
      if (k === 'a') setOrderType('buy')
      if (k === 's') setOrderType('sell')
      if (k === 'd') {
        if (nextLockRef.current) return
        nextLockRef.current = true
        g.next()
        void saveProgress()
        setTimeout(() => (nextLockRef.current = false), 80)
      }
      if (k === 'r') {
        if ((useGame.getState().chartChangesLeft ?? 0) > 0) void resetGame()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [g, canPlay, saveProgress, resetGame])

  // ---------- 부팅: 서버 → 로컬 → 새 게임 ----------
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    restoringRef.current = true

    ;(async () => {
      // 내 정보
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

      // 1) 서버 이어하기
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
                cursor?: number
                ts?: number
                cash: number
                shares: number
                turn?: number
                avgPrice?: number | null
                history?: Trade[]
              }
            }

            // ★ 캐시 먼저 시도
            let ohlcArr = readOhlcFromCache(ginfo.symbol, ginfo.startIndex)
            if (!ohlcArr) {
              // API가 윈도우를 새로 뽑는 경우를 막기 위해 startIndex를 고정 파라미터로 전달
              const hist = await fetch(
                `/api/history?symbol=${encodeURIComponent(ginfo.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}&startIndex=${ginfo.startIndex}`,
                { cache: 'no-store' }
              )
              const hjson = await hist.json()
              ohlcArr = hjson.ohlc as OHLC[]
              writeOhlcToCache(ginfo.symbol, ginfo.startIndex, ohlcArr)
            }

            setOhlc(ohlcArr)
            setSymbolLabel(`${ginfo.symbol}`)
            setGameId(ginfo.id)
            setStartCapital(ginfo.startCash)

            const closes = ohlcArr.map(d => d.close)
            g.init({
              symbol: ginfo.symbol,
              prices: closes,
              startIndex: ginfo.startIndex, // ★ 서버 startIndex 그대로
              maxTurns: ginfo.maxTurns ?? RESERVED_TURNS,
              feeBps: ginfo.feeBps ?? (g.feeBps ?? 5),
              slippageBps: g.slippageBps ?? 0,
              startCash: ginfo.startCash,
            })

            const snap = ginfo.snapshot
            if (snap) {
              const snapCursor = (typeof snap.cursor === 'number' ? snap.cursor : undefined) ??
                                 (typeof snap.ts === 'number' ? snap.ts : undefined) ??
                                 ginfo.startIndex
              ;(g as any).setCursor?.(snapCursor)
              ;(g as any).setCash?.(snap.cash)
              ;(g as any).setShares?.(snap.shares)
              useGame.setState({
                turn: typeof snap.turn === 'number' ? snap.turn : g.turn,
                avgPrice: typeof snap.avgPrice === 'number' || snap.avgPrice === null ? snap.avgPrice : g.avgPrice,
                history: Array.isArray(snap.history) ? snap.history : [],
              })
            } else {
              const local = readLocal()
              if (local && local.meta?.symbol === ginfo.symbol && local.meta?.startIndex === ginfo.startIndex) {
                ;(g as any).setCursor?.(local.snap.cursor)
                ;(g as any).setCash?.(local.snap.cash)
                ;(g as any).setShares?.(local.snap.shares)
                useGame.setState({
                  turn: typeof local.snap.turn === 'number' ? local.snap.turn : g.turn,
                  avgPrice:
                    typeof local.snap.avgPrice === 'number' || local.snap.avgPrice === null
                      ? local.snap.avgPrice
                      : g.avgPrice,
                  history: Array.isArray(local.snap.history) ? local.snap.history : [],
                  chartChangesLeft:
                    typeof local.meta.chartChangesLeft === 'number'
                      ? local.meta.chartChangesLeft
                      : useGame.getState().chartChangesLeft ?? 3,
                })
              }
            }

            // 로컬 동기화
            writeLocal(
              {
                id: ginfo.id,
                symbol: ginfo.symbol,
                startIndex: ginfo.startIndex,
                maxTurns: ginfo.maxTurns ?? RESERVED_TURNS,
                feeBps: ginfo.feeBps ?? (g.feeBps ?? 5),
                slippageBps: g.slippageBps ?? 0,
                startCash: ginfo.startCash,
                chartChangesLeft: useGame.getState().chartChangesLeft ?? 3,
              },
              {
                cursor: useGame.getState().cursor,
                cash: useGame.getState().cash,
                shares: useGame.getState().shares,
                turn: useGame.getState().turn,
                avgPrice: useGame.getState().avgPrice,
                history: useGame.getState().history as Trade[],
              }
            )

            setChartKey(k => k + 1)
            restoringRef.current = false
            return
          }
        }
      } catch {}

      // 2) 로컬 이어하기
      const local = readLocal()
      if (local?.meta?.symbol) {
        try {
          let ohlcArr = readOhlcFromCache(local.meta.symbol, local.meta.startIndex)
          if (!ohlcArr) {
            const hist = await fetch(
              `/api/history?symbol=${encodeURIComponent(local.meta.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}&startIndex=${local.meta.startIndex}`,
              { cache: 'no-store' }
            )
            const hjson = await hist.json()
            ohlcArr = hjson.ohlc as OHLC[]
            writeOhlcToCache(local.meta.symbol, local.meta.startIndex, ohlcArr)
          }

          setOhlc(ohlcArr)
          setSymbolLabel(`${local.meta.symbol}`)
          setGameId(local.meta.id ?? null)
          setStartCapital(local.meta.startCash ?? 10_000_000)

          const closes = ohlcArr.map(d => d.close)
          g.init({
            symbol: local.meta.symbol,
            prices: closes,
            startIndex: local.meta.startIndex,
            maxTurns: local.meta.maxTurns ?? RESERVED_TURNS,
            feeBps: local.meta.feeBps ?? (g.feeBps ?? 5),
            slippageBps: local.meta.slippageBps ?? 0,
            startCash: local.meta.startCash ?? 10_000_000,
          })

          useGame.setState({
            cursor: local.snap.cursor,
            cash: local.snap.cash,
            shares: local.snap.shares,
            turn: typeof local.snap.turn === 'number' ? local.snap.turn : g.turn,
            avgPrice:
              typeof local.snap.avgPrice === 'number' || local.snap.avgPrice === null
                ? local.snap.avgPrice
                : g.avgPrice,
            history: Array.isArray(local.snap.history) ? local.snap.history : [],
            chartChangesLeft:
              typeof local.meta.chartChangesLeft === 'number'
                ? local.meta.chartChangesLeft
                : useGame.getState().chartChangesLeft ?? 3,
          })

          setChartKey(k => k + 1)
          restoringRef.current = false
          return
        } catch {}
      }

      // 3) 둘 다 없으면 새 게임
      let uni = universeRef.current
      if (!uni || uni.length === 0) {
        uni = await loadUniverseWithNames()
        universeRef.current = uni
      }
      const chosen = pickRandom<SymbolItem>(uni)
      await loadAndInitBySymbol(chosen.symbol, { consumeHeart: true })
      setSymbolLabel(`${chosen.name} (${chosen.symbol})`)
      restoringRef.current = false
    })()
  }, [loadUniverseWithNames, loadAndInitBySymbol, g, setHearts])

  // 값 계산
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

    const feeAccrued = (g as any).feeAccrued ?? 0
    const grossProfit = endCapital - startCapital
    const taxRateBps = (g as any).taxRateBps ?? 0
    const taxOnly = grossProfit > 0 ? Math.floor((grossProfit * taxRateBps) / 10000) : 0
    const taxAndFees = Math.max(0, feeAccrued) + Math.max(0, taxOnly)

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
    } catch {}

    try {
      const res = await fetch('/api/leaderboard?period=7d', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.myRank) {
          rank = data.myRank.rank ?? null
          prevRank = null
        }
      }
    } catch {}

    clearLocal() // 게임 종료 시 로컬 스냅 제거

    setResult({
      startCapital,
      endCapital,
      profit: endCapital - startCapital,
      profitRate: finalReturnPct,
      tax: taxAndFees,
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
                      if (nextLockRef.current) return
                      nextLockRef.current = true
                      g.next()
                      await saveProgress()
                      setTimeout(() => { nextLockRef.current = false }, 80)
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
                <div className="text-sm text-gray-500">초기자산 {fmt(startCapital)}</div>
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
              ? maxBuyableShares(
                  g.cash,
                  g.prices[g.cursor] ?? 0,
                  g.feeBps ?? 5,
                  g.slippageBps ?? 0
                )
              : g.shares
          }
          onClose={() => setOrderType(null)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </div>
  )
}
