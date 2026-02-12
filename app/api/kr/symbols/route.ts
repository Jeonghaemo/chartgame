// app/api/kr/symbols/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const preferredRegion = ['sin1']
export const revalidate = 300 // 5분 캐시

type MarketId = 'STK' | 'KSQ' // KOSPI / KOSDAQ (KRX 표기)

type RawItem = {
  code: string
  name: string
  mkt: MarketId
  delisted: boolean
  listDate?: string // yyyymmdd
}

// --- in-memory cache (12h) ---
let CACHE: {
  ts: number
  symbols: string[]
  symbolsWithNames: Array<{
    symbol: string
    name: string
    market: string
    listDate?: string
    listAgeDays?: number
  }>
} | null = null
const TTL = 1000 * 60 * 60 * 12

// KRX JSON 조회 엔드포인트 (OTP 없이)
const KRX_JSON_URL = 'https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'
const KRX_REFERER = 'https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd'

// 오늘(한국시간) yyyymmdd
function todayKST() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 3600000)
  const y = kst.getFullYear()
  const m = (kst.getMonth() + 1).toString().padStart(2, '0')
  const d = kst.getDate().toString().padStart(2, '0')
  return `${y}${m}${d}`
}

function yyyymmddToDateKST(yyyymmdd: string): Date | null {
  if (!/^\d{8}$/.test(yyyymmdd)) return null
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  // KST 자정 기준 (UTC+9)
  const dt = new Date(Date.UTC(y, m, d, 0, 0, 0))
  return dt
}

function diffDaysKST(a: string, b: string): number | null {
  const da = yyyymmddToDateKST(a)
  const db = yyyymmddToDateKST(b)
  if (!da || !db) return null
  const ms = db.getTime() - da.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return undefined
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function krxPostForm(form: Record<string, string>, retry = 2) {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    Referer: KRX_REFERER,
    Origin: 'https://data.krx.co.kr',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Accept: 'application/json, text/javascript, */*; q=0.01',
  }

  const body = new URLSearchParams(form)

  let lastErr: any = null
  for (let i = 0; i <= retry; i++) {
    try {
      const res = await fetch(KRX_JSON_URL, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`KRX HTTP ${res.status} ${res.statusText} :: ${t.slice(0, 200)}`)
      }

      return await res.json()
    } catch (e) {
      lastErr = e
      if (i < retry) {
        await sleep(250 * (i + 1))
        continue
      }
    }
  }

  throw lastErr ?? new Error('KRX request failed')
}

// 시장별(코스피/코스닥) JSON 조회 → 종목코드 배열
async function fetchCodes(mktId: MarketId): Promise<RawItem[]> {
  const trdDd = todayKST()

  /**
   * KRX 표준통계: 상장회사목록 (MDCSTAT01901)
   * - OTP/CSV 없이 JSON을 직접 받는다
   */
  const js = await krxPostForm({
    bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
    locale: 'ko_KR',
    mktId, // STK / KSQ
    trdDd, // 기준일
    share: '1',
    searchType: '1',
    csvxls_isNo: 'false',
  })

  // 화면/시점에 따라 block 키가 다를 수 있어 후보를 넓게 잡음
  const block =
    (Array.isArray(js?.block1) ? js.block1 : null) ||
    (Array.isArray(js?.output) ? js.output : null) ||
    (Array.isArray(js?.OutBlock_1) ? js.OutBlock_1 : null) ||
    []

  const out: RawItem[] = []

  for (const row of block) {
    // 종목코드(6자리) 후보 키들
    const rawCode = String(
      pick(row, [
        'ISU_SRT_CD',
        'isu_srt_cd',
        'isu_cd',
        'ISU_CD',
        'SRT_CD',
        'code',
        '종목코드',
        '단축코드',
      ]) ?? ''
    ).replace(/[^0-9]/g, '')

    if (!rawCode || rawCode.length !== 6) continue
    const code = rawCode.padStart(6, '0')

    // 종목명 후보 키들
    const name = String(
      pick(row, [
        'ISU_ABBRV',
        'isu_abbrv',
        'ISU_NM',
        'isu_nm',
        'name',
        '종목명',
        '한글종목명',
        '회사명',
      ]) ?? ''
    ).trim()
    if (!name) continue

    // 상장일 후보 키들 (yyyymmdd)
    let listDate: string | undefined
    const ld = String(
      pick(row, ['LIST_DD', 'list_dd', 'LIST_DT', 'list_dt', '상장일', '상장일자']) ?? ''
    ).replace(/[^0-9]/g, '')
    if (ld.length === 8) listDate = ld

    // JSON에서는 상장폐지 정보가 없거나 불안정 → 일단 false
    const delisted = false

    out.push({ code, name, mkt: mktId, delisted, listDate })
  }

  return out
}

// 게임에 적합하지 않은 종목 필터링
function filterSymbols(
  symbols: Array<{ symbol: string; name: string; market: string; listDate?: string; listAgeDays?: number }>,
  filters: {
    excludeETF?: boolean
    excludeREIT?: boolean
    excludePreferred?: boolean
    gameOptimized?: boolean
    excludeListedWithinDays?: number // N일 이내 신규상장 제외
  }
) {
  const today = todayKST()
  return symbols.filter((item) => {
    const { symbol, name, listDate } = item
    const code = symbol.replace(/\.(KS|KQ)$/, '')

    // ETF 제외
    if (filters.excludeETF) {
      if (
        code.match(/^1\d{5}$/) ||
        name.includes('ETF') ||
        name.includes('ETN') ||
        name.includes('인덱스') ||
        name.includes('레버리지') ||
        name.includes('인버스')
      )
        return false
    }

    // REIT 제외
    if (filters.excludeREIT) {
      if (name.includes('리츠') || name.includes('REIT') || name.includes('부동산투자') || code.match(/^35\d{4}$/))
        return false
    }

    // 우선주 제외
    if (filters.excludePreferred) {
      if (name.includes('우') || name.includes('우선주') || symbol.includes('5.KS') || symbol.includes('7.KS'))
        return false
    }

    // 게임 최적화 필터
    if (filters.gameOptimized) {
      if (
        name.length < 2 ||
        name.includes('스팩') ||
        name.includes('SPAC') ||
        name.includes('기업인수목적') ||
        /^제\d+호/.test(name)
      )
        return false
    }

    // 신규상장 N일 이내 제외
    if (filters.excludeListedWithinDays && listDate) {
      const dd = diffDaysKST(listDate, today)
      if (dd != null && dd < filters.excludeListedWithinDays) return false
    }

    return true
  })
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const includeNames = url.searchParams.get('names') === 'true'
    const excludeETF = url.searchParams.get('excludeETF') !== 'false' // 기본값: true
    const excludeREIT = url.searchParams.get('excludeREIT') === 'true'
    const excludePreferred = url.searchParams.get('excludePreferred') === 'true'
    const gameOptimized = url.searchParams.get('gameOptimized') === 'true'
    const maxCount = parseInt(url.searchParams.get('maxCount') || '0') || 0
    const excludeListedWithinDays = parseInt(url.searchParams.get('excludeListedWithinDays') || '0') || 0

    // 캐시 확인
    if (CACHE && Date.now() - CACHE.ts < TTL) {
      let result = includeNames ? CACHE.symbolsWithNames : CACHE.symbols

      if (includeNames && (excludeETF || excludeREIT || excludePreferred || gameOptimized || excludeListedWithinDays > 0)) {
        const filtered = filterSymbols(CACHE.symbolsWithNames, {
          excludeETF,
          excludeREIT,
          excludePreferred,
          gameOptimized,
          excludeListedWithinDays,
        })
        result = filtered

        if (maxCount > 0 && filtered.length > maxCount) {
          const shuffled = [...filtered].sort(() => Math.random() - 0.5)
          result = shuffled.slice(0, maxCount)
        }
      }

      return NextResponse.json({
        symbols: includeNames ? result : (result as string[]),
        cached: true,
        count: Array.isArray(result) ? result.length : 0,
        filters: { excludeETF, excludeREIT, excludePreferred, gameOptimized, excludeListedWithinDays },
      })
    }

    console.log('KRX 데이터 새로 수집 중...')

    // 코스피 + 코스닥 동시 수집 (JSON)
    const [stk, ksq] = await Promise.all([
      fetchCodes('STK').catch((err) => {
        console.error('코스피 데이터 수집 실패:', err)
        return []
      }),
      fetchCodes('KSQ').catch((err) => {
        console.error('코스닥 데이터 수집 실패:', err)
        return []
      }),
    ])
    if (stk.length === 0 && ksq.length === 0) throw new Error('코스피, 코스닥 데이터 모두 수집 실패')

    const allData = [...stk, ...ksq]

    // 심볼 및 상세정보 생성 (+ listDate / listAgeDays)
    const today = todayKST()
    const symbolsWithNames = allData.map((s) => {
      const symbol = `${s.code}.${s.mkt === 'STK' ? 'KS' : 'KQ'}`
      const market = s.mkt === 'STK' ? '코스피' : '코스닥'
      const listAgeDays = s.listDate ? diffDaysKST(s.listDate, today) ?? undefined : undefined
      return {
        symbol,
        name: s.name,
        market,
        listDate: s.listDate,
        listAgeDays,
      }
    })

    // 중복 제거
    const uniqueMap = new Map<string, (typeof symbolsWithNames)[number]>()
    symbolsWithNames.forEach((item) => {
      if (!uniqueMap.has(item.symbol)) uniqueMap.set(item.symbol, item)
    })
    const uniqueSymbolsWithNames = Array.from(uniqueMap.values())
    const symbols = uniqueSymbolsWithNames.map((item) => item.symbol)

    // 캐시 저장
    CACHE = {
      ts: Date.now(),
      symbols,
      symbolsWithNames: uniqueSymbolsWithNames,
    }

    console.log(`KRX 데이터 수집 완료: 코스피 ${stk.length}개, 코스닥 ${ksq.length}개, 총 ${symbols.length}개`)

    // 필터링 적용
    let result: any = includeNames ? uniqueSymbolsWithNames : symbols
    if (includeNames && (excludeETF || excludeREIT || excludePreferred || gameOptimized || excludeListedWithinDays > 0)) {
      const filtered = filterSymbols(uniqueSymbolsWithNames, {
        excludeETF,
        excludeREIT,
        excludePreferred,
        gameOptimized,
        excludeListedWithinDays,
      })
      result = filtered

      if (maxCount > 0 && filtered.length > maxCount) {
        const shuffled = [...filtered].sort(() => Math.random() - 0.5)
        result = shuffled.slice(0, maxCount)
      }
    }

    return NextResponse.json({
      symbols: result,
      cached: false,
      count: Array.isArray(result) ? result.length : 0,
      meta: {
        kospi: stk.length,
        kosdaq: ksq.length,
        total: symbols.length,
        filtered: Array.isArray(result) ? result.length : symbols.length,
      },
      filters: { excludeETF, excludeREIT, excludePreferred, gameOptimized, excludeListedWithinDays },
    })
  } catch (err) {
    console.error('[KRX symbols] error:', err)

    const fallbackSymbols = [
      '005930.KS',
      '000660.KS',
      '035420.KS',
      '035720.KS',
      '051910.KS',
      '006400.KS',
      '207940.KS',
      '005380.KS',
      '000270.KS',
      '068270.KS',
      '096770.KS',
      '017670.KS',
      '030200.KS',
      '003550.KS',
      '055550.KS',
      '105560.KS',
      '086790.KS',
      '323410.KS',
      '009540.KS',
      '010130.KS',
      '247540.KQ',
      '086520.KQ',
      '196170.KQ',
      '091990.KQ',
      '352820.KQ',
      '036570.KQ',
      '251270.KQ',
      '095340.KQ',
      '039030.KQ',
      '095700.KQ',
    ]

    return NextResponse.json(
      {
        symbols: fallbackSymbols,
        cached: false,
        count: fallbackSymbols.length,
        error: err instanceof Error ? err.message : 'Unknown error',
        fallback: true,
      },
      { status: 200 }
    )
  }
}
