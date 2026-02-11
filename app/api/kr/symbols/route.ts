// app/api/kr/symbols/route.ts
import { NextRequest, NextResponse } from 'next/server'
import iconv from 'iconv-lite'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const revalidate = 300;  // 5분 캐시
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
  symbolsWithNames: Array<{ symbol: string; name: string; market: string; listDate?: string; listAgeDays?: number }>
} | null = null
const TTL = 1000 * 60 * 60 * 12

// KRX OTP 생성 엔드포인트 / CSV 다운로드 경로
const GEN_URL = 'https://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd'
const DL_URL = 'https://data.krx.co.kr/comm/fileDn/download_csv/download.cmd'

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
  // Date.UTC 는 UTC로 만들기 때문에 +9h 살짝 더해줘도 되고, 일수 차이만 볼거라 그대로 써도 충분
  return dt
}
function diffDaysKST(a: string, b: string): number | null {
  const da = yyyymmddToDateKST(a)
  const db = yyyymmddToDateKST(b)
  if (!da || !db) return null
  const ms = db.getTime() - da.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// KRX CSV 한 줄 파싱(단순)
function csvParse(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(l => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]
      if (ch === '"') {
        if (q && l[i + 1] === '"') { cur += '"'; i++ } else { q = !q }
      } else if (ch === ',' && !q) {
        out.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out.map(s => s.trim())
  })
}

// --- KRX 요청 안정화 유틸 (쿠키/타임아웃/영업일 fallback) ---
const REFERER_PAGE = 'https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT01901.jspx'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

// KRX는 종종 세션 쿠키가 있어야 OTP/CSV가 안정적으로 동작함
async function getKrxCookie(): Promise<string> {
  const res = await fetchWithTimeout(REFERER_PAGE, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    // next fetch는 cookie jar를 자동으로 관리하지 않으니 직접 set-cookie를 읽어야 함
    cache: 'no-store',
  }, 12_000)

  // set-cookie가 여러 개일 수 있음
  const setCookies = res.headers.get('set-cookie')
  if (!setCookies) return ''
  // 첫 쿠키만 써도 되는 경우가 많지만, 안전하게 앞부분만
  // (Vercel 환경에서는 너무 길게 넣으면 헤더 제한에 걸릴 수 있어 최소화)
  return setCookies.split(',').map(s => s.split(';')[0]).join('; ')
}

// 오늘이 휴장일일 수 있으니 최근 n일 중에서 성공하는 trdDd를 찾는다
function kstYmdFromDate(dt: Date) {
  const utc = dt.getTime() + dt.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 3600000)
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function recentKstDays(maxBackDays = 10) {
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i <= maxBackDays; i++) {
    const dt = new Date(now.getTime() - i * 86400_000)
    out.push(kstYmdFromDate(dt))
  }
  return out
}

// 시장별(코스피/코스닥) CSV 다운로드 → 종목코드 배열
async function fetchCodes(mktId: MarketId): Promise<RawItem[]> {
  const cookie = await getKrxCookie()
  const trdDdCandidates = recentKstDays(10) // 최근 10일 안에서 성공하는 기준일 찾기

  // 공통 헤더 (KRX가 XHR/Origin/Referer를 더 엄격히 보는 경우가 있음)
  const commonHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': REFERER_PAGE,
    'Origin': 'https://data.krx.co.kr',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  }
  if (cookie) commonHeaders['Cookie'] = cookie

  let lastErr: any = null

  for (const trdDd of trdDdCandidates) {
    try {
      const form = new URLSearchParams({
        locale: 'ko_KR',
        mktId,                    // 'STK' or 'KSQ'
        trdDd,                    // 기준일
        share: '1',
        searchType: '1',
        csvxls_isNo: 'false',
        name: 'fileDown',
        url: 'dbms/MDC/STAT/standard/MDCSTAT01901',
      })

      // 1) OTP 발급 (간헐 실패 대비 1회 재시도)
      let otp = ''
      for (let attempt = 0; attempt < 2; attempt++) {
        const otpRes = await fetchWithTimeout(GEN_URL, {
          method: 'POST',
          headers: commonHeaders,
          body: form.toString(),
          cache: 'no-store',
        }, 12_000)

        const otpText = await otpRes.text()
        if (otpRes.ok && otpText && otpText.length >= 10 && !otpText.includes('<html')) {
          otp = otpText.trim()
          break
        }

        lastErr = new Error(`OTP 발급 실패(${mktId}, ${trdDd}): ${otpRes.status} ${otpRes.statusText} / body=${otpText.slice(0, 80)}`)
        await sleep(250)
      }

      if (!otp) throw lastErr ?? new Error(`유효하지 않은 OTP(${mktId}, ${trdDd})`)

      // 2) CSV 다운로드 (EUC-KR)
      const csvRes = await fetchWithTimeout(DL_URL, {
        method: 'POST',
        headers: commonHeaders,
        body: `code=${encodeURIComponent(otp)}`,
        cache: 'no-store',
      }, 12_000)

      if (!csvRes.ok) {
        const t = await csvRes.text().catch(() => '')
        throw new Error(`CSV 다운로드 실패(${mktId}, ${trdDd}): ${csvRes.status} ${csvRes.statusText} / body=${t.slice(0, 80)}`)
      }

      const buf = await csvRes.arrayBuffer()
      const csv = iconv.decode(Buffer.from(buf), 'euc-kr')

      const rows = csvParse(csv)
      if (rows.length < 2) {
        // 휴장일이면 header만 있거나 비어있는 경우가 있어 다음 날짜 후보로 넘어감
        lastErr = new Error(`CSV 파싱 실패(${mktId}, ${trdDd}): ${rows.length}개 행`)
        continue
      }

      const header = rows[0]
      const idxCode = header.findIndex(h => /(종목코드|단축코드)/.test(h))
      const idxName = header.findIndex(h => /(종목명|한글종목명|회사명)/.test(h))
      const idxDelisted = header.findIndex(h => /상장폐지일|상장폐지/.test(h))
      const idxListDate = header.findIndex(h => /상장일/.test(h))

      if (idxCode === -1) throw new Error(`종목코드 컬럼을 찾을 수 없음(${mktId}, ${trdDd})`)

      const out: RawItem[] = []
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const raw = (r[idxCode] || '').replace(/[^0-9]/g, '')
        if (!raw || raw.length !== 6) continue

        const code = raw.padStart(6, '0')
        const name = (r[idxName] || '').trim()
        const delisted = idxDelisted >= 0 ? Boolean((r[idxDelisted] || '').trim()) : false

        let listDate: string | undefined
        if (idxListDate >= 0) {
          const ld = (r[idxListDate] || '').replace(/[^0-9]/g, '')
          if (ld.length === 8) listDate = ld
        }

        if (!name) continue
        if (delisted) continue

        out.push({ code, name, mkt: mktId, delisted, listDate })
      }

      // 성공하면 바로 반환
      if (out.length > 0) return out

      // 행은 있는데 필터로 다 빠졌다면(드물지만) 다음 후보로
      lastErr = new Error(`유효 데이터 0개(${mktId}, ${trdDd})`)
    } catch (e) {
      lastErr = e
      // 다음 trdDd 후보로 계속
      continue
    }
  }

  throw lastErr ?? new Error(`KRX 수집 실패(${mktId}): unknown`)
}


// 게임에 적합하지 않은 종목 필터링
function filterSymbols(
  symbols: Array<{ symbol: string; name: string; market: string; listDate?: string; listAgeDays?: number }>,
  filters: {
    excludeETF?: boolean
    excludeREIT?: boolean
    excludePreferred?: boolean
    gameOptimized?: boolean
    excludeListedWithinDays?: number // ★ N일 이내 신규상장 제외
  }
) {
  const today = todayKST()
  return symbols.filter(item => {
    const { symbol, name, listDate } = item
    const code = symbol.replace(/\.(KS|KQ)$/, '')

    // ETF 제외
    if (filters.excludeETF) {
      if (
        code.match(/^1\d{5}$/) || // ETF는 보통 1로 시작
        name.includes('ETF') ||
        name.includes('ETN') ||
        name.includes('인덱스') ||
        name.includes('레버리지') ||
        name.includes('인버스')
      ) return false
    }

    // REIT 제외
    if (filters.excludeREIT) {
      if (
        name.includes('리츠') ||
        name.includes('REIT') ||
        name.includes('부동산투자') ||
        code.match(/^35\d{4}$/)
      ) return false
    }

    // 우선주 제외
    if (filters.excludePreferred) {
      if (
        name.includes('우') ||
        name.includes('우선주') ||
        symbol.includes('5.KS') || // 우선주는 보통 끝자리가 5/7
        symbol.includes('7.KS')
      ) return false
    }

    // 게임 최적화 필터
    if (filters.gameOptimized) {
      if (
        name.length < 2 ||
        name.includes('스팩') ||
        name.includes('SPAC') ||
        name.includes('기업인수목적') ||
        /^제\d+호/.test(name)
      ) return false
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
    const excludeListedWithinDays = parseInt(url.searchParams.get('excludeListedWithinDays') || '0') || 0 // ★

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
        filters: { excludeETF, excludeREIT, excludePreferred, gameOptimized, excludeListedWithinDays }
      })
    }

    console.log('KRX 데이터 새로 수집 중...')

    // 코스피 + 코스닥 동시 수집
    const [stk, ksq] = await Promise.all([
      fetchCodes('STK').catch(err => { console.error('코스피 데이터 수집 실패:', err); return [] }),
      fetchCodes('KSQ').catch(err => { console.error('코스닥 데이터 수집 실패:', err); return [] }),
    ])
    if (stk.length === 0 && ksq.length === 0) throw new Error('코스피, 코스닥 데이터 모두 수집 실패')

    const allData = [...stk, ...ksq]

    // 심볼 및 상세정보 생성 (+ listDate / listAgeDays)
    const today = todayKST()
    const symbolsWithNames = allData.map(s => {
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
    symbolsWithNames.forEach(item => {
      if (!uniqueMap.has(item.symbol)) uniqueMap.set(item.symbol, item)
    })
    const uniqueSymbolsWithNames = Array.from(uniqueMap.values())
    const symbols = uniqueSymbolsWithNames.map(item => item.symbol)

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
        error: err instanceof Error ? err.message : 'Unknown error',
        fallback: true
      },
      { status: 200 }
    )
  }
}
