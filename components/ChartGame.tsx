// components/ChartGame.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import Card from './Card'
import CandleChart from '@/components/CandleChart'
import { useGame } from '@/game/store/gameStore'
import { valuation, pnlPct } from '@/game/store/helpers'
import AdRecharge from '@/components/AdRecharge'
import OrderModal from '@/components/OrderModal'
import GameResultModal from '@/components/GameResultModal'
import { useUserStore } from '@/lib/store/user'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import AdBanner from '@/components/AdBanner'
import AdBannerMobile from '@/components/AdBannerMobile'

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number }
type Trade = { side: 'BUY' | 'SELL'; price: number; qty: number; time: string }
type SymbolItem = { symbol: string; name: string; market: string }

const SYMBOL_CACHE_KEY_NAMES = 'kr_symbols_with_names_v1'
const SYMBOL_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12h
const MIN_VISIBLE = 365
const RESERVED_TURNS = 60
const MIN_TOTAL_CANDLES = MIN_VISIBLE + RESERVED_TURNS // 425
const NEXT_LOCK_MS = 30

// 종목명 공개 정책
const HIDE_SYMBOL_DURING_PLAY = true
const REVEAL_SYMBOL_AFTER_FINISH = true

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
let CURRENT_USER_ID: string | null = null; // ← 전역으로 현재 사용자 ID 저장

type LocalMeta = {
  id: string | null
  symbol: string
  startIndex: number
  maxTurns: number
  feeBps: number
  slippageBps: number
  startCash: number
  chartChangesLeft: number
  sliceStartTs?: number | null // 서버가 내려준 구간 앵커(초)
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

const makeLsKey = () => `chartgame_current_v3_${CURRENT_USER_ID ?? 'guest'}`

function readLocal(): LocalState | null {
  try { return JSON.parse(localStorage.getItem(makeLsKey()) || 'null') } catch { return null }
}
function writeLocal(meta: LocalMeta, snap: LocalSnap) {
  try { localStorage.setItem(makeLsKey(), JSON.stringify({ meta, snap: { ...snap, ts: Date.now() } })) } catch {}
}
function clearLocal() {
  try { localStorage.removeItem(makeLsKey()) } catch {}
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
const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

// === 내 순위/계급 표시용 ===
function getRankBadge(total: number) {
  if (total >= 5_000_000_000) return { name: '졸업자', icon: '👑', color: 'bg-purple-100 text-purple-700' }
  if (total >= 1_000_000_000)   return { name: '승리자', icon: '🏆', color: 'bg-yellow-100 text-yellow-800' }
  if (total >= 100_000_000)     return { name: '물방개', icon: '🐳', color: 'bg-blue-100 text-blue-800' }
  if (total >= 50_000_000)      return { name: '불장러', icon: '🚀', color: 'bg-red-100 text-red-700' }
  if (total >= 20_000_000)      return { name: '존버러', icon: '🐢', color: 'bg-green-100 text-green-700' }
  return { name: '주린이', icon: '🐣', color: 'bg-gray-100 text-gray-700' }
}

type MyRank = {
  rank: number
  total: number
  avgReturnPct?: number
  winRate?: number
  wins?: number
  losses?: number
}

// 유틸 함수들 섹션에 추가
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 하트 카운트다운 훅
function useHeartCountdown(lastRefillAt?: string | Date | null, hearts?: number, maxHearts?: number) {
  const [remain, setRemain] = useState<string>("")
  useEffect(() => {
    if (!lastRefillAt || hearts == null || maxHearts == null || hearts >= maxHearts) {
      setRemain("")
      return
    }
    const interval = setInterval(() => {
      const last = new Date(lastRefillAt).getTime()
      const next = last + 1000 * 60 * 60 // 1시간
      const diff = Math.max(0, next - Date.now())
      const mm = String(Math.floor(diff / 1000 / 60)).padStart(2, "0")
      const ss = String(Math.floor((diff / 1000) % 60)).padStart(2, "0")
      setRemain(`${mm}:${ss}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastRefillAt, hearts, maxHearts])
  return remain
}

const HeartCountdownText = memo(function HeartCountdownText({
  lastRefillAt,
  hearts,
  maxHearts,
}: {
  lastRefillAt?: string | Date | null
  hearts: number
  maxHearts: number
}) {
  const countdown = useHeartCountdown(lastRefillAt, hearts, maxHearts)
  if (!countdown) return null
  return <span className="ml-2 text-sm text-gray-500">⏳ {countdown} 후 + 1</span>
})

export default function ChartGame() {
  const g = useGame()
  const router = useRouter()
  const lastUsedSymbolRef = useRef<string>('')
  
  // 게스트 모드
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    try { return localStorage.getItem('guestMode') === '1' } catch { return false }
  })

  const [ohlc, setOhlc] = useState<OHLC[]>([])
  const [chartKey, setChartKey] = useState(0)
  const [chartHeight, setChartHeight] = useState<number>(720)

  const [symbolLabel, setSymbolLabel] = useState<string>('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [startCapital, setStartCapital] = useState<number>(0)
  const [orderType, setOrderType] = useState<null | 'buy' | 'sell'>(null)
  const [isGameEnd, setIsGameEnd] = useState(false)
  const [canStart, setCanStart] = useState(true)
  const [myRank, setMyRank] = useState<MyRank | null>(null)
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
    symbol?: string
  }>(null)

  const universeRef = useRef<SymbolItem[]>([])
  const bootedRef = useRef(false)
  const nextLockRef = useRef(false)
  const startInFlightRef = useRef(false)
  const restoringRef = useRef(true)
const recentSymbolsRef = useRef<string[]>([])
  // === 중복 요청/레이스 방지 추가 ===
  const loadInFlightRef = useRef(false)
  const lastAbortRef = useRef<AbortController | null>(null)

  const hearts = useUserStore(s => s.hearts) ?? 0;
  const setHearts = useUserStore(state => state.setHearts)
  const maxHearts = useUserStore(s => s.maxHearts) ?? 5;
  const lastRefillAt = useUserStore(s => s.lastRefillAt)

  // 차트 높이 (모바일 반응형)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      if (w < 1024) {
        const target = Math.max(280, Math.min(Math.floor(h * 0.55), 620))
        setChartHeight(target)
      } else {
        setChartHeight(720)
      }
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', calc)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('orientationchange', calc)
    }
  }, [])

  // 저장(서버+로컬)
  const saveProgress = useCallback(async () => {
 // 너무 자주 저장하지 않도록 제한
  const now = Date.now()
  const lastSaveKey = 'last_save_time'
  const lastSave = parseInt(localStorage.getItem(lastSaveKey) || '0')
  if (now - lastSave < 500) return // 0.5초 이내 중복 저장 방지
  localStorage.setItem(lastSaveKey, now.toString())

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

    // 서버 저장 (게스트 제외, gameId 있을 때만)
    if (!guestMode && gameId) {
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

    const prevLocal = readLocal();
    const meta: LocalMeta = {
      id: gameId ?? null,
      symbol,
      startIndex: g.startIndex ?? 0,
      maxTurns: g.maxTurns ?? RESERVED_TURNS,
      feeBps: g.feeBps ?? 5,
      slippageBps: g.slippageBps ?? 0,
      startCash: startCapital || 10_000_000,
      chartChangesLeft: useGame.getState().chartChangesLeft ?? 0,
      sliceStartTs: prevLocal?.meta?.sliceStartTs ?? undefined,
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
  }, [guestMode, gameId, g.status, g.cursor, g.cash, g.shares, g.turn, g.avgPrice, g.history, g.prices, g.maxTurns, g.feeBps, g.slippageBps, g.startIndex, startCapital])

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
    const id = setTimeout(() => { void saveProgress() }, 1000)
    return () => clearTimeout(id)
  }, [g.cursor, g.cash, g.shares, g.turn, g.avgPrice, g.history, saveProgress])

  // 심볼 리스트 로딩
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
    localStorage.setItem(SYMBOL_CACHE_KEY_NAMES, JSON.stringify({ symbols: valid, ts: Date.now() }))
    return valid.length ? valid : [
      
{ symbol: '005930.KS', name: '삼성전자', market: '코스피' },
{ symbol: '000660.KS', name: 'SK하이닉스', market: '코스피' },
{ symbol: '051910.KS', name: 'LG화학', market: '코스피' },
{ symbol: '006400.KS', name: '삼성SDI', market: '코스피' },
{ symbol: '207940.KS', name: '삼성바이오로직스', market: '코스피' },
{ symbol: '068270.KS', name: '셀트리온', market: '코스피' },
{ symbol: '035420.KS', name: 'NAVER', market: '코스피' },
{ symbol: '035720.KS', name: '카카오', market: '코스피' },
{ symbol: '005380.KS', name: '현대차', market: '코스피' },
{ symbol: '000270.KS', name: '기아', market: '코스피' },
{ symbol: '012330.KS', name: '현대모비스', market: '코스피' },
{ symbol: '066570.KS', name: 'LG전자', market: '코스피' },
{ symbol: '003670.KS', name: '포스코퓨처엠', market: '코스피' },
{ symbol: '005490.KS', name: 'POSCO홀딩스', market: '코스피' },
{ symbol: '034020.KS', name: '두산에너빌리티', market: '코스피' },
{ symbol: '105560.KS', name: 'KB금융', market: '코스피' },
{ symbol: '055550.KS', name: '신한지주', market: '코스피' },
{ symbol: '086790.KS', name: '하나금융지주', market: '코스피' },
{ symbol: '316140.KS', name: '우리금융지주', market: '코스피' },
{ symbol: '028260.KS', name: '삼성물산', market: '코스피' },
{ symbol: '017670.KS', name: 'SK텔레콤', market: '코스피' },
{ symbol: '030200.KS', name: 'KT', market: '코스피' },
{ symbol: '090430.KS', name: '아모레퍼시픽', market: '코스피' },
{ symbol: '009150.KS', name: '삼성전기', market: '코스피' },
{ symbol: '018260.KS', name: '삼성에스디에스', market: '코스피' },
{ symbol: '010130.KS', name: '고려아연', market: '코스피' },
{ symbol: '011200.KS', name: 'HMM', market: '코스피' },
{ symbol: '024110.KS', name: '기업은행', market: '코스피' },
{ symbol: '032830.KS', name: '삼성생명', market: '코스피' },
{ symbol: '010950.KS', name: 'S-Oil', market: '코스피' },
{ symbol: '010140.KS', name: '삼성중공업', market: '코스피' },
{ symbol: '000720.KS', name: '현대건설', market: '코스피' },
{ symbol: '047050.KS', name: '포스코인터내셔널', market: '코스피' },
{ symbol: '042660.KS', name: '한화오션', market: '코스피' },
{ symbol: '009830.KS', name: '한화솔루션', market: '코스피' },
{ symbol: '034730.KS', name: 'SK', market: '코스피' },
{ symbol: '096770.KS', name: 'SK이노베이션', market: '코스피' },
{ symbol: '161390.KS', name: '한국타이어앤테크놀로지', market: '코스피' },
{ symbol: '021240.KS', name: '코웨이', market: '코스피' },
{ symbol: '033780.KS', name: 'KT&G', market: '코스피' },
{ symbol: '004020.KS', name: '현대제철', market: '코스피' },
{ symbol: '036570.KS', name: '엔씨소프트', market: '코스피' },
{ symbol: '003550.KS', name: 'LG', market: '코스피' },
{ symbol: '008770.KS', name: '호텔신라', market: '코스피' },
{ symbol: '051900.KS', name: 'LG생활건강', market: '코스피' },
{ symbol: '010620.KS', name: '현대미포조선', market: '코스피' },
{ symbol: '000810.KS', name: '삼성화재', market: '코스피' },
{ symbol: '018880.KS', name: '한온시스템', market: '코스피' },
{ symbol: '071050.KS', name: '한국금융지주', market: '코스피' },
// 코스닥 50
{ symbol: '247540.KQ', name: '에코프로비엠', market: '코스닥' },
{ symbol: '086520.KQ', name: '에코프로', market: '코스닥' },
{ symbol: '091990.KQ', name: '셀트리온헬스케어', market: '코스닥' },
{ symbol: '196170.KQ', name: '알테오젠', market: '코스닥' },
{ symbol: '263750.KQ', name: '펄어비스', market: '코스닥' },
{ symbol: '293490.KQ', name: '카카오게임즈', market: '코스닥' },
{ symbol: '214150.KQ', name: '클래시스', market: '코스닥' },
{ symbol: '041510.KQ', name: '에스엠', market: '코스닥' },
{ symbol: '078600.KQ', name: '대주전자재료', market: '코스닥' },
{ symbol: '036830.KQ', name: '솔브레인', market: '코스닥' },
{ symbol: '140860.KQ', name: '파크시스템스', market: '코스닥' },
{ symbol: '095700.KQ', name: '제넥신', market: '코스닥' },
{ symbol: '240810.KQ', name: '원익IPS', market: '코스닥' },
{ symbol: '039030.KQ', name: '이오테크닉스', market: '코스닥' },
{ symbol: '064350.KQ', name: '현대로템', market: '코스닥' },
{ symbol: '068760.KQ', name: '셀트리온제약', market: '코스닥' },
{ symbol: '067310.KQ', name: '하나마이크론', market: '코스닥' },
{ symbol: '253450.KQ', name: '스튜디오드래곤', market: '코스닥' },
{ symbol: '112040.KQ', name: '위메이드', market: '코스닥' },
{ symbol: '058470.KQ', name: '리노공업', market: '코스닥' },
{ symbol: '122870.KQ', name: '와이지엔터테인먼트', market: '코스닥' },
{ symbol: '278280.KQ', name: '천보', market: '코스닥' },
{ symbol: '298050.KQ', name: '효성첨단소재', market: '코스닥' },
{ symbol: '036540.KQ', name: 'SFA반도체', market: '코스닥' },
{ symbol: '104480.KQ', name: '티케이케미칼', market: '코스닥' },
{ symbol: '253590.KQ', name: '네오위즈', market: '코스닥' },
{ symbol: '052690.KQ', name: '한전기술', market: '코스닥' },
{ symbol: '052260.KQ', name: '현대바이오', market: '코스닥' },
{ symbol: '025900.KQ', name: '동화기업', market: '코스닥' },
{ symbol: '084990.KQ', name: '헬릭스미스', market: '코스닥' },
{ symbol: '078340.KQ', name: '컴투스', market: '코스닥' },
{ symbol: '357780.KQ', name: '솔브레인홀딩스', market: '코스닥' },
{ symbol: '222800.KQ', name: '심텍', market: '코스닥' },
{ symbol: '237690.KQ', name: '에스티팜', market: '코스닥' },
{ symbol: '036930.KQ', name: '주성엔지니어링', market: '코스닥' },
{ symbol: '086900.KQ', name: '메디톡스', market: '코스닥' },
{ symbol: '102710.KQ', name: '이엔에프테크놀로지', market: '코스닥' },
{ symbol: '215200.KQ', name: '메가스터디교육', market: '코스닥' },
{ symbol: '067630.KQ', name: '에이치엘비', market: '코스닥' },
{ symbol: '183300.KQ', name: '코미코', market: '코스닥' },
{ symbol: '064760.KQ', name: '티씨케이', market: '코스닥' },
{ symbol: '096530.KQ', name: '씨젠', market: '코스닥' },
{ symbol: '051600.KQ', name: '한전KPS', market: '코스닥' },
{ symbol: '078130.KQ', name: '국일제지', market: '코스닥' },
{ symbol: '083790.KQ', name: '크리스탈지노믹스', market: '코스닥' },
{ symbol: '145020.KQ', name: '휴젤', market: '코스닥' },
{ symbol: '032500.KQ', name: '케이엠더블유', market: '코스닥' },
{ symbol: '053800.KQ', name: '안랩', market: '코스닥' },
{ symbol: '214450.KQ', name: '파마리서치', market: '코스닥' },


    ]
  }, [])

  // 코드 → "이름 (코드)" 라벨 해석
  const resolveLabel = useCallback(async (code: string) => {
    const hit1 = universeRef.current?.find?.(s => s.symbol === code)
    if (hit1) return `${hit1.name} (${hit1.symbol})`
    try {
      const raw = localStorage.getItem(SYMBOL_CACHE_KEY_NAMES)
      if (raw) {
        const cached = JSON.parse(raw) as { symbols?: SymbolItem[] }
        const hit2 = cached?.symbols?.find?.(s => s.symbol === code)
        if (hit2) return `${hit2.name} (${hit2.symbol})`
      }
    } catch {}
    return code
  }, [])

  /**
   * 차트 로딩 + 초기화
   * consumeHeart=true: 새 게임 시작 (하트 차감, chartChangesLeft=3)
   * consumeHeart=false: 차트만 변경 (하트 비소모)
   */
  const loadAndInitBySymbol = useCallback(
    async (sym: string, opts?: { consumeHeart?: boolean }) => {
      // 게스트면 무조건 하트 비소모
      const consumeHeart = guestMode ? false : (opts?.consumeHeart !== false)

      // ===== 중복 로딩 가드 + 직전 요청 취소 =====
      if (loadInFlightRef.current) return
      loadInFlightRef.current = true
      try { lastAbortRef.current?.abort() } catch {}
      lastAbortRef.current = new AbortController()
      const { signal } = lastAbortRef.current

      try {
        let capital = 10_000_000
        // 게스트가 아니면 /api/me 로 최신 상태 동기화 (팝업은 여기서 하지 않음)
        if (!guestMode) {
          try {
            const meRes = await fetch(`/api/me?t=${Date.now()}`, { cache: 'no-store', signal })
            if (meRes.ok) {
              const me = await meRes.json()
              CURRENT_USER_ID = me?.user?.id ?? null
              capital = me?.user?.capital ?? 10_000_000
              if (typeof me?.user?.hearts === 'number') {
                setHearts(me.user.hearts)
                setCanStart(me.user.hearts > 0)
              }
            }
          } catch {}
        }
        setStartCapital(capital)

        // 차트 로딩
        const r = await fetch(
          `/api/history?symbol=${encodeURIComponent(sym)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}`,
          { cache: 'no-store', signal }
        )
        const response = await r.json().catch(() => ({}))
        const { ohlc: ohlcResp, startIndex: startIndexResp } = response as { ohlc: OHLC[]; startIndex: number }

        // 데이터 유효성 가드 → 다른 심볼로 재시도 (같은 심볼 제외)
        if (!Array.isArray(ohlcResp) || ohlcResp.length === 0 || !Number.isFinite(startIndexResp)) {
          let uni = universeRef.current
          if (!uni || uni.length === 0) {
            uni = await loadUniverseWithNames()
            universeRef.current = uni
          }
          const pool = uni.filter(s => s.symbol !== sym)
          if (pool.length > 0) {
            loadInFlightRef.current = false
            await loadAndInitBySymbol(pickRandom<SymbolItem>(pool).symbol, { consumeHeart: false })
          }
          return
        }

        const fixedStartTs: number | null =
          typeof response?.meta?.fixedStartTs === 'number' ? response.meta.fixedStartTs : null

        setOhlc(ohlcResp)
        writeOhlcToCache(sym, startIndexResp, ohlcResp)
        const closes = ohlcResp.map((d: any) => d.close)

        if (consumeHeart) {
          const resp = await fetch('/api/game/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
              code: sym,
              startIndex: startIndexResp,
              startCash: capital,
              feeBps: g.feeBps ?? 5,
              maxTurns: RESERVED_TURNS,
              forceNew: true,
              
            }),
          })

          if (!resp.ok) {
            const j = await resp.json().catch(() => ({}))
            if (!guestMode && j?.error === 'NO_HEART') {
              setCanStart(false)
              setHearts(0)
              alert('하트가 부족합니다. 1시간마다 1개씩 충전됩니다. 무료 충전 서비스를 이용하세요!')
              router.push('/')
              return
            }
            alert('게임 시작 중 오류가 발생했습니다.')
            return
          }

          const data = await resp.json()
          const newGameId = data?.gameId ?? null
          const confirmedSymbol = data?.symbol ?? sym
          const confirmedStartIndex = data?.startIndex ?? startIndexResp
          const confirmedSliceStartTs =
            typeof data?.sliceStartTs === 'number'
              ? data.sliceStartTs
              : (typeof fixedStartTs === 'number' ? fixedStartTs : null)

          clearLocal()
setGameId(newGameId)

          writeLocal(
            {
              id: newGameId,
              symbol: confirmedSymbol,
              startIndex: confirmedStartIndex,
              maxTurns: RESERVED_TURNS,
              feeBps: g.feeBps ?? 5,
              slippageBps: g.slippageBps ?? 0,
              startCash: capital,
              chartChangesLeft: 3,
              
            },
            {
              cursor: confirmedStartIndex,
              cash: Math.floor(capital),
              shares: 0,
              turn: 0,
              avgPrice: null,
              history: [],
            }
          )

          if (typeof data?.hearts === 'number') {
            setHearts(data.hearts)
            setCanStart(data.hearts > 0)
          }

          useGame.setState({ chartChangesLeft: 3 })

          g.init({
            symbol: confirmedSymbol,
            prices: closes,
            startIndex: confirmedStartIndex,
            maxTurns: RESERVED_TURNS,
            feeBps: g.feeBps ?? 5,
            slippageBps: g.slippageBps ?? 0,
            startCash: capital,
          })

          ;(g as any).setCursor?.(confirmedStartIndex)
          setSymbolLabel(await resolveLabel(confirmedSymbol))
          setChartKey(k => k + 1)
          restoringRef.current = false
          return
        }

        // 비소모 경로(게스트 포함)
        g.init({
          symbol: sym,
          prices: closes,
          startIndex: startIndexResp,
          maxTurns: RESERVED_TURNS,
          feeBps: g.feeBps ?? 5,
          slippageBps: g.slippageBps ?? 0,
          startCash: capital,
        })

        ;(g as any).setCursor?.(startIndexResp)
        setSymbolLabel(await resolveLabel(sym))

        const currentLeft =
          useGame.getState().chartChangesLeft ??
          readLocal()?.meta?.chartChangesLeft ??
          3

        writeLocal(
          {
            id: guestMode ? null : null,
            symbol: sym,
            startIndex: startIndexResp,
            maxTurns: RESERVED_TURNS,
            feeBps: g.feeBps ?? 5,
            slippageBps: g.slippageBps ?? 0,
            startCash: capital,
            chartChangesLeft: currentLeft,
            
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
      } finally {
        loadInFlightRef.current = false
      }
    },
    [guestMode, g, setHearts, router, resolveLabel, loadUniverseWithNames]
  )

  // 차트변경(하트 비소모)
  const resetGame = useCallback(async () => {
    // 로딩 중엔 무시
    if (loadInFlightRef.current) return

    const state = useGame.getState()
    const hasBought = (state.history as Trade[]).some(t => t.side === 'BUY')
    const canChangeChartNow = (state.chartChangesLeft ?? 0) > 0 && state.turn === 0 && !hasBought
    if (!canChangeChartNow) {
      alert('차트 변경은 시작 직후(턴 0, 매수 전)에만 가능합니다.')
      return
    }
    setGameId(null)
    let uni = universeRef.current
    if (!uni || uni.length === 0) {
      uni = await loadUniverseWithNames()
      universeRef.current = uni
    }
    const chosen = pickRandom<SymbolItem>(uni)
    restoringRef.current = true
    await loadAndInitBySymbol(chosen.symbol, { consumeHeart: false })
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

  // 단축키
  const hasBoughtMemo = useMemo(
    () => (g.history as Trade[]).some(t => t.side === 'BUY'),
    [g.history]
  )
  const chartChangesLeft = useGame(state => state.chartChangesLeft ?? 0)
  const canChangeChart = chartChangesLeft > 0 && g.turn === 0 && !hasBoughtMemo

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (g.status !== 'playing') return
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
        setTimeout(() => (nextLockRef.current = false), NEXT_LOCK_MS)
      }
      if (k === 'r') {
        if (canChangeChart) void resetGame()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [g, saveProgress, resetGame, canChangeChart])

    // ---------- 부팅: 서버 → 로컬 → 새 게임 ----------
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    restoringRef.current = true

    ;(async () => {
      // 1) 항상 me 먼저 조회해서 로그인 여부 확인
      CURRENT_USER_ID = null
      let isLoggedIn = false

      try {
        const meRes = await fetch(`/api/me?t=${Date.now()}`, { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          CURRENT_USER_ID = me?.user?.id ?? null
          isLoggedIn = !!CURRENT_USER_ID

          if (isLoggedIn) {
            // 로그인 성공 → guestMode 강제 해제
            setGuestMode(false)
            try { localStorage.setItem('guestMode', '0') } catch {}

            const currentHearts = me?.user?.hearts ?? 0
            setHearts(currentHearts)
            setCanStart(currentHearts > 0)
            setStartCapital(me?.user?.capital ?? 10_000_000)
          }
        }
      } catch (e) {
        console.log('me 조회 실패', e)
      }

      // 2) 로그인 안 돼 있으면 게스트 부팅
      if (!isLoggedIn) {
        setGuestMode(true)
        try { localStorage.setItem('guestMode', '1') } catch {}

        setCanStart(true)
        setStartCapital(10_000_000)
        let uni = universeRef.current
        if (!uni || uni.length === 0) {
          uni = await loadUniverseWithNames()
          universeRef.current = uni
        }
        const chosen = pickRandom<SymbolItem>(uni)
        await loadAndInitBySymbol(chosen.symbol, { consumeHeart: false })
        restoringRef.current = false
        return
      }

      // 3) 서버에 진행 중인 게임이 있으면 복원 (기기 간 이어하기)
      try {
        const curRes = await fetch('/api/game/current', { cache: 'no-store' })
        if (curRes.ok) {
          const cur = await curRes.json()
          const game = cur?.game

          // 진행 중인 + 스냅샷이 있는 게임이면 서버 스냅샷 기준으로 복원
          if (game && game.snapshot) {
            const symbol: string = game.symbol
            const startIndex: number =
              typeof game.startIndex === 'number' ? game.startIndex : 0
            const startCash: number =
              typeof game.startCash === 'number' ? game.startCash : 10_000_000
            const feeBps: number =
              typeof game.feeBps === 'number' ? game.feeBps : (g.feeBps ?? 5)
            const slippageBps: number = g.slippageBps ?? 0
            const maxTurns: number =
              typeof game.maxTurns === 'number' ? game.maxTurns : RESERVED_TURNS

            const snapshot = game.snapshot ?? null

            // snapshot 기준으로 진행상황 복원
            const cursor: number =
              snapshot && typeof snapshot.cursor === 'number'
                ? snapshot.cursor
                : startIndex

            const cash: number =
              snapshot && typeof snapshot.cash === 'number'
                ? snapshot.cash
                : startCash

            const shares: number =
              snapshot && typeof snapshot.shares === 'number'
                ? snapshot.shares
                : 0

            const turn: number =
              snapshot && typeof snapshot.turn === 'number'
                ? snapshot.turn
                : 0

            const avgPrice: number | null =
              snapshot && typeof snapshot.avgPrice === 'number'
                ? snapshot.avgPrice
                : null

            const history: Trade[] =
              snapshot && Array.isArray(snapshot.history)
                ? snapshot.history
                : []

            const chartChangesLeft: number =
              useGame.getState().chartChangesLeft ?? 3

            // OHLC 로딩 (캐시 우선)
            let ohlcArr = readOhlcFromCache(symbol, startIndex)
            if (!ohlcArr) {
              const hist = await fetch(
                `/api/history?symbol=${encodeURIComponent(symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}` +
                  `&startIndex=${startIndex}`,
                { cache: 'no-store' }
              )
              const hjson = await hist.json()
              ohlcArr = (hjson.ohlc ?? []) as OHLC[]
              if (Array.isArray(ohlcArr) && ohlcArr.length > 0) {
                writeOhlcToCache(symbol, startIndex, ohlcArr)
              }
            }

            if (Array.isArray(ohlcArr) && ohlcArr.length > 0) {
              // cursor가 범위를 넘지 않도록 가드
              const maxCursor = ohlcArr.length - 1
              const safeCursor = Math.max(0, Math.min(cursor, maxCursor))

              setOhlc(ohlcArr)
              setSymbolLabel(await resolveLabel(symbol))
              setGameId(game.id ?? null)
              setStartCapital(startCash)

              const closes = ohlcArr.map(d => d.close)
              g.init({
                symbol,
                prices: closes,
                startIndex,
                maxTurns,
                feeBps,
                slippageBps,
                startCash,
              })

              useGame.setState({
                cursor: safeCursor,
                cash,
                shares,
                turn,
                avgPrice,
                history,
                chartChangesLeft,
              })

              // 이 기기에도 로컬 스냅 저장 (오프라인/새로고침 대비)
              writeLocal(
                {
                  id: game.id ?? null,
                  symbol,
                  startIndex,
                  maxTurns,
                  feeBps,
                  slippageBps,
                  startCash,
                  chartChangesLeft,
                  sliceStartTs:
                    typeof game.sliceStartTs === 'number'
                      ? game.sliceStartTs
                      : undefined,
                },
                {
                  cursor: safeCursor,
                  cash,
                  shares,
                  turn,
                  avgPrice,
                  history,
                }
              )

              setChartKey(k => k + 1)
              restoringRef.current = false
              return // 서버 게임 복원 완료 → 이후 로컬/새 게임 로직으로 안 내려감
            }
          }
        }
      } catch (e) {
        console.log('서버 진행 게임 복원 실패', e)
        // 실패하면 조용히 로컬/새 게임으로 진행
      }

      // 4) 로컬 저장 복원
      const local = readLocal()
      if (local?.meta?.symbol) {
        try {
          let ohlcArr = readOhlcFromCache(local.meta.symbol, local.meta.startIndex)
          if (!ohlcArr) {
            const hist = await fetch(
              `/api/history?symbol=${encodeURIComponent(local.meta.symbol)}&slice=${MIN_VISIBLE}&turns=${RESERVED_TURNS}` +
                `&startIndex=${local.meta.startIndex}`,
              { cache: 'no-store' }
            )

            const hjson = await hist.json()
            ohlcArr = hjson.ohlc as OHLC[]
            writeOhlcToCache(local.meta.symbol, local.meta.startIndex, ohlcArr)
          }

          setOhlc(ohlcArr)
          setSymbolLabel(await resolveLabel(local.meta.symbol))
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
        } catch {
          console.log('로컬 복원 실패, 같은 심볼로 재시작:', local.meta.symbol)
          await loadAndInitBySymbol(local.meta.symbol, { consumeHeart: false })
          restoringRef.current = false
          return
        }
      }

      // 5) 새 게임 시작
      let uni = universeRef.current
      if (!uni || uni.length === 0) {
        uni = await loadUniverseWithNames()
        universeRef.current = uni
      }

      // 최근 3개 심볼 제외하고 선택
      const availableSymbols = uni.filter(s => !recentSymbolsRef.current.includes(s.symbol))
      const poolToUse = availableSymbols.length > 0 ? availableSymbols : uni
      const shuffled = fisherYatesShuffle(poolToUse)
      const chosen = shuffled[0]

      // 선택된 심볼을 최근 목록에 추가
      recentSymbolsRef.current = [chosen.symbol, ...recentSymbolsRef.current].slice(0, 3)
      await loadAndInitBySymbol(chosen.symbol, { consumeHeart: true })
      restoringRef.current = false
    })()
  }, [loadUniverseWithNames, loadAndInitBySymbol, resolveLabel, setHearts, setGuestMode])


// 내 순위 불러오기 (전체기간) — 게스트면 패스
useEffect(() => {
  if (guestMode) return
  ;(async () => {
    try {
      // 전체기간 우선
      let r = await fetch('/api/leaderboard?period=all', { cache: 'no-store' })
      // 폴백: all 미지원이면 기본값 시도
      if (!r.ok) {
        r = await fetch('/api/leaderboard', { cache: 'no-store' })
      }
      if (!r.ok) return
      const j = await r.json()
      if (j?.myRank) {
        setMyRank({
          rank: Number(j.myRank.rank ?? 0),
          total: Number(j.myRank.total ?? 0),
          avgReturnPct: Number(j.myRank.avgReturnPct ?? 0),
          winRate: Number(j.myRank.winRate ?? 0),
          wins: Number(j.myRank.wins ?? 0),
          losses: Number(j.myRank.losses ?? 0),
        })
      }
    } catch {}
  })()
}, [guestMode])


  // prices / cursor 안전 가드 + 값 계산
  const safeCursor = Number.isFinite(g.cursor) ? Math.max(0, Math.min(g.cursor, g.prices.length - 1)) : 0
  const last = g.prices[safeCursor] != null ? Math.round(g.prices[safeCursor]) : 0
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

    // [추가] finish 전에 이전 순위 조회 (period=all)
    try {
      if (!guestMode) {
        let preRes = await fetch('/api/leaderboard?period=all', { cache: 'no-store' })
        if (!preRes.ok) {
          preRes = await fetch('/api/leaderboard', { cache: 'no-store' })
        }
        if (preRes.ok) {
          const pre = await preRes.json()
          if (pre?.myRank) {
            prevRank = typeof pre.myRank.rank === 'number' ? pre.myRank.rank : null
          }
        }
      }
    } catch {}

    // finish 호출(점수 반영)
    try {
      if (!guestMode && gameId) {
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

    // [변경] finish 이후 현재 순위 재조회 (period=all)
    try {
      if (!guestMode) {
        let postRes = await fetch('/api/leaderboard?period=all', { cache: 'no-store' })
        if (!postRes.ok) {
          postRes = await fetch('/api/leaderboard', { cache: 'no-store' })
        }
        if (postRes.ok) {
          const post = await postRes.json()
          if (post?.myRank) {
            rank = typeof post.myRank.rank === 'number' ? post.myRank.rank : null
          }
        }
      }
    } catch {}

    clearLocal()

    const symLabel = await resolveLabel(String((g as any).symbol))
    const finalSymbolLabel = REVEAL_SYMBOL_AFTER_FINISH ? symLabel : '비공개'

    setResult({
      startCapital,
      endCapital,
      profit: endCapital - startCapital,
      profitRate: finalReturnPct,
      symbol: finalSymbolLabel,
      tax: taxAndFees,
      tradeCount: g.history.length,
      turnCount: g.turn + 1,
      heartsLeft: hearts ?? 0,
      rank,       // 현재 순위 (finish 이후)
      prevRank,   // 이전 순위 (finish 이전)
    })
    setIsGameEnd(true)
    g.end()
  }, [guestMode, gameId, startCapital, total, ret, g.history.length, g.turn, g, hearts, resolveLabel])


  const fmt = (n?: number) => (n == null ? '-' : Math.round(n).toLocaleString())

  const trades: Trade[] = useMemo(() => {
    const visibleTimes = new Set(
      ohlc.slice(0, safeCursor + 1).map(d => {
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
  }, [ohlc, safeCursor, g.history])

  const handleOrderSubmit = async (qty: number) => {
    if (g.status !== 'playing') return
    const currentOhlc = ohlc[safeCursor]
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

  const rateColor = (v:number) => (v >= 0 ? 'text-green-600' : 'text-red-600')

  return (
  <div className="fixed left-0 right-0 bottom-0 top-[80px] overflow-y-auto overflow-x-hidden">

      {/* ✅ AdSense 광고 영역 */}
      <div className="my-2">
        <div className="mx-auto w-full px-2 lg:px-4">
          {/* PC 전용: 기존 가로 배너 */}
          <div className="hidden md:block">
            <div className="mx-auto w-full max-w-[1000px]">
              <AdBanner slot="2809714485" />
            </div>
          </div>

          {/* 모바일 전용: Large Mobile Banner (320×100 고정 컨테이너) */}
          <div className="md:hidden flex justify-center">
            <div className="w-[320px]">
              <AdBannerMobile slot="5937026455" />
            </div>
          </div>
        </div>
      </div>
      {/* 모바일 */}
      <div className="block lg:hidden h-full">
        <div className="h-full flex flex-col">
          {/* 상단 요약 */}
          <div className="px-4 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div>
                <div>총 평가자산</div>
                <div className="text-base font-bold text-slate-800">{fmt(total)} </div>
              </div>
              <div>
                <div>총 수익금</div>
                <div className={`text-base font-bold ${total - (startCapital||0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {(total - (startCapital||0)).toLocaleString()}
                </div>
              </div>
              <div>
                <div>총 수익률</div>
                <div className={`text-base font-bold ${ret >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {ret.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* 차트 카드 */}
          <div className="px-2">
            <Card className="p-2">
              {(() => {
                const end = Math.min(ohlc.length, Math.max(0, safeCursor + 1));
                const dataSlice = ohlc.slice(0, end);
                return (
                  <CandleChart
                    key={chartKey}
                    data={dataSlice}
                    fullForMA={ohlc}
                    height={chartHeight}
                    sma={[5, 10, 20, 60, 120, 240]}
                    showLegend
                    showVolume
                    trades={trades}
                  />
                );
              })()}
            </Card>
          </div>

          {/* 하단 컨트롤 바 */}
          <div className="mt-auto">
            <div className="sticky bottom-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.04)] px-3 pt-2 pb-3">
              {/* 턴/진행바 */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <div>
                  <span className="font-semibold">{String(g.turn + 1).padStart(2, '0')}</span>/{g.maxTurns}턴 · 일
                </div>
                <div className="text-gray-500">현재가 {last != null ? fmt(last) : '-'}</div>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${Math.min(100, Math.max(0, ((g.turn + 1) / g.maxTurns) * 100))}%` }}
                />
              </div>

          {/* 액션 버튼 */}
<div className="grid grid-cols-3 gap-2 items-center">
  {/* 매수 */}
  <button
    onClick={() => setOrderType('buy')}
    disabled={g.status !== 'playing'}
    className="flex-1 rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    매수
  </button>

  {/* 매도 */}
  <button
    onClick={() => setOrderType('sell')}
    disabled={g.status !== 'playing'}
    className="flex-1 rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    매도
  </button>

  {/* 다음 */}
  <button
    onClick={async () => {
      if (nextLockRef.current) return;
      nextLockRef.current = true;
      g.next();
      await saveProgress();
      setTimeout(() => { nextLockRef.current = false }, NEXT_LOCK_MS);
    }}
    disabled={g.status !== 'playing'}
    aria-label="다음"
    className="flex-1 rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    다음
  </button>
</div>



              {/* 차트 변경/게임 종료 */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={async () => { if (canChangeChart) await resetGame(); }}
                  disabled={!canChangeChart}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${canChangeChart ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
                  title={canChangeChart ? '하트 소모 없이 차트만 변경' : '턴 0, 매수 전만 변경 가능'}
                >
                  차트 변경 ×{useGame.getState().chartChangesLeft ?? 0}
                </button>
                <button
                  onClick={() => (g.status === 'playing' ? endGame() : router.push('/'))}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  게임 종료
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱 */}
      <div className="hidden lg:flex h-full w-full justify-center items-start">
        <div className="h-full w-full max-w-[1800px]">
          <div className="grid h-full w-full gap-4 grid-cols-[minmax(0,1fr)_480px] p-4">
            <div className="min-w-0">
              <Card className="p-3 h-full">
                <div className="mb-2 text-sm text-gray-500">
                  종목: <span className="font-semibold">
                    {HIDE_SYMBOL_DURING_PLAY ? '비공개' : (symbolLabel || '로딩 중...')}
                  </span>
                </div>

                {(() => {
                  const end = Math.min(ohlc.length, Math.max(0, safeCursor + 1))
                  const dataSlice = ohlc.slice(0, end)
                  return (
                    <CandleChart
                      key={chartKey}
                      data={dataSlice}
                      fullForMA={ohlc}
                      height={720}
                      sma={[5, 10, 20, 60, 120, 240]}
                      showLegend
                      showVolume
                      trades={trades}
                    />
                  )
                })()}
              </Card>
            </div>

            <aside className="space-y-4 overflow-auto px-3">
              <AdRecharge />

              <Card className="p-2 text-center">
                <div className="text-xl font-bold text-slate-700">
                  보유 자산 {(startCapital || 10_000_000).toLocaleString()}원
                </div>

                <div className="mt-2 text-lg font-semibold flex items-center justify-center gap-2">
                  <Heart
                    className={`w-5 h-5 ${hearts >= maxHearts ? 'fill-red-500 text-red-500' : 'text-red-500'}`}
                  />
                  <span>{hearts} / {maxHearts}</span>
                  <HeartCountdownText
                    lastRefillAt={lastRefillAt}
                    hearts={hearts}
                    maxHearts={maxHearts}
                  />
                </div>

                {myRank && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="ml-2 text-gray-500">순위</span>
                      <span className="font-bold">{myRank.rank}위</span>
                      {(() => {
                        const badge = getRankBadge(myRank.total)
                        return (
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                            {badge.icon} {badge.name}
                          </span>
                        )
                      })()}
                      {typeof myRank.avgReturnPct === 'number' && (
                        <span className={`ml-0 ${myRank.avgReturnPct >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          수익률 {myRank.avgReturnPct.toFixed(2)}%
                        </span>
                      )}
                      {typeof myRank.winRate === 'number' && (
                        <span className="ml-0 text-gray-600">
                          · 승률 {myRank.winRate.toFixed(1)}%
                          {(myRank.wins!=null&&myRank.losses!=null) && ` (${myRank.wins}승 ${myRank.losses}패)`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-600">
                    <span className="font-semibold">{String(g.turn + 1).padStart(2, '0')}</span>/{g.maxTurns}턴 · 일
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetGame}
                      disabled={!canChangeChart}
                      className={`rounded-xl border px-3 py-2 text-sm ${canChangeChart ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
                      title={
                        canChangeChart
                          ? '하트 소모 없이 차트만 변경합니다. (단축키: R)'
                          : '차트 변경은 시작 직후(턴 0, 매수 전)에만 가능합니다.'
                      }
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
                    disabled={g.status !== 'playing'}
                    className="col-span-1 rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    매수 (A)
                  </button>
                  <button
                    onClick={() => setOrderType('sell')}
                    disabled={g.status !== 'playing'}
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
                      setTimeout(() => { nextLockRef.current = false }, NEXT_LOCK_MS)
                    }}
                    disabled={g.status !== 'playing'}
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
                <div className={`mt-1 font-semibold ${ret >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
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
          currentPrice={g.prices[safeCursor] != null ? Math.round(g.prices[safeCursor]) : 0}
          maxShares={
            orderType === 'buy'
              ? Math.floor(g.cash / ((g.prices[safeCursor] ?? 0) * (1 + (g.slippageBps ?? 0) / 10000) * (1 + (g.feeBps ?? 0) / 10000)))
              : g.shares
          }
          onClose={() => setOrderType(null)}
          onSubmit={async (qty) => {
            if (g.status !== 'playing') return
            const currentOhlc = ohlc[safeCursor]
            const tradeTime =
              typeof currentOhlc.time === 'number'
                ? currentOhlc.time > 1e12
                  ? Math.floor(currentOhlc.time / 1000)
                  : currentOhlc.time
                : Math.floor(new Date(currentOhlc.time).getTime() / 1000)

            if (orderType === 'buy') g.buy(qty, tradeTime)
            if (orderType === 'sell') g.sell(qty, tradeTime)
            await saveProgress()
          }}
        />
      )}
    </div>
  )
}
