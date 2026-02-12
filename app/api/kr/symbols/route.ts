// app/api/kr/symbols/route.ts
import { NextRequest, NextResponse } from 'next/server'
import iconv from 'iconv-lite'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const preferredRegion = ['sin1']
export const revalidate = 300 // 5분 캐시

type MarketId = 'STK' | 'KSQ' // KOSPI / KOSDAQ (KRX 표기)

type SymbolItem = {
  symbol: string // 000000.KS / 000000.KQ
  name: string
  market: string // 코스피/코스닥
  listDate?: string
  listAgeDays?: number
}

type CacheShape = {
  ts: number
  symbols: string[]
  symbolsWithNames: SymbolItem[]
}

let CACHE: CacheShape | null = null
const TTL = 1000 * 60 * 60 * 12 // 12h

// ----------------- 유틸 -----------------
function todayKST() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 3600000)
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function yyyymmddToDateKST(yyyymmdd: string): Date | null {
  if (!/^\d{8}$/.test(yyyymmdd)) return null
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  return new Date(Date.UTC(y, m, d, 0, 0, 0))
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

function csvParse(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map((l) => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]
      if (ch === '"') {
        if (q && l[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          q = !q
        }
      } else if (ch === ',' && !q) {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out.map((s) => s.trim())
  })
}

// ----------------- 1) KRX JSON (data.krx.co.kr) -----------------
const KRX_JSON_URL = 'https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'
const KRX_MAIN = 'https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd'

async function fetchKrxJsonMarket(mktId: MarketId) {
  // mktsel: STK/KSQ 를 finder에 넣으면 해당 시장만 꽤 잘 나오는 편
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    'Referer': KRX_MAIN,
    'Origin': 'https://data.krx.co.kr',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'X-Requested-With': 'XMLHttpRequest',
  }

  const body = new URLSearchParams({
    bld: 'dbms/comm/finder/finder_stkisu',
    mktsel: mktId, // STK/KSQ
    typeNo: '0',
    searchText: '',
  })

  const res = await fetch(KRX_JSON_URL, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`KRX JSON HTTP ${res.status} ${res.statusText} :: ${t.slice(0, 200)}`)
  }

  const json = await res.json()
  const block = Array.isArray(json?.block1) ? json.block1 : []
  if (!block.length) throw new Error('KRX JSON block1 empty')

  const out: Array<{ code: string; name: string; mkt: MarketId }> = []
  for (const row of block) {
    const code = String(pick(row, ['short_code', 'shortCode', 'isu_cd', 'isuCd', 'ISU_CD']) ?? '').replace(
      /[^0-9]/g,
      ''
    )
    const name = String(pick(row, ['korName', 'kor_name', 'isu_nm', 'isuNm', 'ISU_NM']) ?? '').trim()
    if (code.length !== 6 || !name) continue
    out.push({ code, name, mkt: mktId })
  }
  if (!out.length) throw new Error('KRX JSON parsed 0 rows')
  return out
}

// ----------------- 2) KIND CSV (kind.krx.co.kr) 폴백 -----------------
const KIND_DL =
  'https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13'

async function fetchKindAll() {
  // KIND는 대체로 OTP 없이 내려오지만, EUC-KR 인 경우가 많음
  const res = await fetch(KIND_DL, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'text/csv,application/vnd.ms-excel,*/*',
      'Referer': 'https://kind.krx.co.kr/',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`KIND HTTP ${res.status} ${res.statusText} :: ${t.slice(0, 200)}`)
  }

  const buf = await res.arrayBuffer()
  // KIND는 UTF-8일 때도 있고 EUC-KR일 때도 있어서 둘 다 시도
  const raw = Buffer.from(buf)
  let text = ''
  try {
    text = raw.toString('utf8')
    // utf8로 읽었는데 한글이 깨진 느낌이면 euc-kr로 재시도
    if (text.includes('�')) {
      text = iconv.decode(raw, 'euc-kr')
    }
  } catch {
    text = iconv.decode(raw, 'euc-kr')
  }

  const rows = csvParse(text)
  if (rows.length < 2) throw new Error(`KIND CSV rows=${rows.length}`)

  const header = rows[0]
  const idxCode = header.findIndex((h) => /(종목코드|종목 코드|단축코드)/.test(h))
  const idxName = header.findIndex((h) => /(회사명|종목명)/.test(h))
  const idxMarket = header.findIndex((h) => /(시장구분|시장 구분|시장)/.test(h))

  if (idxCode === -1 || idxName === -1) {
    throw new Error(`KIND header not found (code=${idxCode}, name=${idxName})`)
  }

  const out: Array<{ code: string; name: string; mkt: MarketId }> = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const code = String(r[idxCode] ?? '').replace(/[^0-9]/g, '')
    const name = String(r[idxName] ?? '').trim()
    const mktText = String(idxMarket >= 0 ? (r[idxMarket] ?? '') : '').trim()

    if (code.length !== 6 || !name) continue

    // 시장구분이 "KOSPI"/"KOSDAQ" 또는 "유가증권"/"코스닥" 등 다양한 케이스
    let mkt: MarketId | null = null
    if (/KOSDAQ|코스닥/i.test(mktText)) mkt = 'KSQ'
    else if (/KOSPI|유가증권|코스피/i.test(mktText)) mkt = 'STK'

    // 시장구분을 못 읽었으면(가끔 비는 케이스) 그냥 스킵하지 말고 KOSPI/ KOSDAQ 추정 불가 → 제외
    if (!mkt) continue

    out.push({ code, name, mkt })
  }

  if (!out.length) throw new Error('KIND parsed 0 rows')
  return out
}

// ----------------- 게임 필터 -----------------
function filterSymbols(
  symbols: SymbolItem[],
  filters: {
    excludeETF?: boolean
    excludeREIT?: boolean
    excludePreferred?: boolean
    gameOptimized?: boolean
    excludeListedWithinDays?: number
  }
) {
  const today = todayKST()
  return symbols.filter((item) => {
    const { symbol, name, listDate } = item
    const code = symbol.replace(/\.(KS|KQ)$/, '')

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

    if (filters.excludeREIT) {
      if (name.includes('리츠') || name.includes('REIT') || name.includes('부동산투자') || code.match(/^35\d{4}$/))
        return false
    }

    if (filters.excludePreferred) {
      if (name.includes('우') || name.includes('우선주') || symbol.includes('5.KS') || symbol.includes('7.KS'))
        return false
    }

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

    if (filters.excludeListedWithinDays && listDate) {
      const dd = diffDaysKST(listDate, today)
      if (dd != null && dd < filters.excludeListedWithinDays) return false
    }

    return true
  })
}

// ----------------- GET -----------------
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const includeNames = url.searchParams.get('names') === 'true'
    const excludeETF = url.searchParams.get('excludeETF') !== 'false' // 기본 true
    const excludeREIT = url.searchParams.get('excludeREIT') === 'true'
    const excludePreferred = url.searchParams.get('excludePreferred') === 'true'
    const gameOptimized = url.searchParams.get('gameOptimized') === 'true'
    const maxCount = parseInt(url.searchParams.get('maxCount') || '0') || 0
    const excludeListedWithinDays = parseInt(url.searchParams.get('excludeListedWithinDays') || '0') || 0
    const refresh = url.searchParams.get('refresh') === '1'
    const debug = url.searchParams.get('debug') === 'true'

    // 캐시
    if (!refresh && CACHE && Date.now() - CACHE.ts < TTL) {
      let result: any = includeNames ? CACHE.symbolsWithNames : CACHE.symbols

      if (
        includeNames &&
        (excludeETF || excludeREIT || excludePreferred || gameOptimized || excludeListedWithinDays > 0)
      ) {
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
        symbols: result,
        cached: true,
        count: Array.isArray(result) ? result.length : 0,
        filters: { excludeETF, excludeREIT, excludePreferred, gameOptimized, excludeListedWithinDays },
      })
    }

    // 1) KRX JSON 시도 → 실패하면 2) KIND 폴백
    const dbg: any = { used: null as null | 'KRX_JSON' | 'KIND', krxErr: null as any, kindErr: null as any }
    let raw: Array<{ code: string; name: string; mkt: MarketId; listDate?: string }> = []


    try {
      const [stk, ksq] = await Promise.all([fetchKrxJsonMarket('STK'), fetchKrxJsonMarket('KSQ')])
      raw = [...stk, ...ksq]
      dbg.used = 'KRX_JSON'
    } catch (e: any) {
      dbg.krxErr = e?.message || String(e)
      try {
        raw = await fetchKindAll()
        dbg.used = 'KIND'
      } catch (e2: any) {
        dbg.kindErr = e2?.message || String(e2)
        throw new Error(`KRX_JSON 실패 + KIND 실패 | krx=${dbg.krxErr} | kind=${dbg.kindErr}`)
      }
    }

    // 심볼+이름 구성
    const today = todayKST()
    const symbolsWithNames: SymbolItem[] = raw.map((s) => {
      const symbol = `${s.code}.${s.mkt === 'STK' ? 'KS' : 'KQ'}`
      const market = s.mkt === 'STK' ? '코스피' : '코스닥'
      const listAgeDays = s.listDate ? diffDaysKST(s.listDate, today) ?? undefined : undefined
      return { symbol, name: s.name, market, listDate: s.listDate, listAgeDays }
    })

    // 중복 제거
    const map = new Map<string, SymbolItem>()
    for (const it of symbolsWithNames) {
      if (!map.has(it.symbol)) map.set(it.symbol, it)
    }
    const uniqueSymbolsWithNames = Array.from(map.values())
    const symbols = uniqueSymbolsWithNames.map((x) => x.symbol)

    CACHE = { ts: Date.now(), symbols, symbolsWithNames: uniqueSymbolsWithNames }

    // 필터 적용 (names=true 일 때만)
    let result: any = includeNames ? uniqueSymbolsWithNames : symbols
    if (
      includeNames &&
      (excludeETF || excludeREIT || excludePreferred || gameOptimized || excludeListedWithinDays > 0)
    ) {
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
        total: symbols.length,
        used: dbg.used,
      },
      filters: { excludeETF, excludeREIT, excludePreferred, gameOptimized, excludeListedWithinDays },
      ...(debug ? { debug: dbg } : {}),
    })
  } catch (err: any) {
    const fallbackSymbols = [
      '005930.KS','000660.KS','035420.KS','035720.KS','051910.KS','006400.KS','207940.KS','005380.KS','000270.KS',
      '068270.KS','096770.KS','017670.KS','030200.KS','003550.KS','055550.KS','105560.KS','086790.KS','323410.KS',
      '009540.KS','010130.KS','247540.KQ','086520.KQ','196170.KQ','091990.KQ','352820.KQ','036570.KQ','251270.KQ',
      '095340.KQ','039030.KQ','095700.KQ'
    ]

    return NextResponse.json(
      {
        symbols: fallbackSymbols,
        cached: false,
        count: fallbackSymbols.length,
        error: err?.message || String(err),
        fallback: true,
      },
      { status: 200 }
    )
  }
}
