// app/api/kr/symbols/route.ts
import { NextResponse } from 'next/server'
import iconv from 'iconv-lite'

type MarketId = 'STK' | 'KSQ' // KOSPI / KOSDAQ (KRX 표기)

// --- in-memory cache (12h) ---
let CACHE: { ts: number; symbols: string[] } | null = null
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

// KRX CSV 한 줄 파싱(단순)
function csvParse(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(l => {
    // 쉼표 포함 셀 처리(큰따옴표)
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

// 시장별(코스피/코스닥) CSV 다운로드 → 종목코드 배열
async function fetchCodes(mktId: MarketId): Promise<{ code: string; name: string; mkt: MarketId; delisted: boolean }[]> {
  const trdDd = todayKST()
  // KRX 표준통계: 상장회사목록 (MDCSTAT01901)
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

  // 1) OTP 발급
  const otpRes = await fetch(GEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT01901.jspx',
    },
    body: form.toString(),
  })
  const otp = await otpRes.text()

  // 2) CSV 다운로드 (EUC-KR)
  const csvRes = await fetch(DL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT01901.jspx',
    },
    body: `code=${encodeURIComponent(otp)}`,
  })
  const buf = await csvRes.arrayBuffer()
  const csv = iconv.decode(Buffer.from(buf), 'euc-kr') // KRX는 EUC-KR

  const rows = csvParse(csv)
  if (rows.length < 2) return []

  const header = rows[0]
  const idxCode = header.findIndex(h => /종목코드/.test(h))
  const idxName = header.findIndex(h => /종목명|한글종목명/.test(h))
  const idxDelisted = header.findIndex(h => /상장폐지일|상장폐지/.test(h))

  const out: { code: string; name: string; mkt: MarketId; delisted: boolean }[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const raw = (r[idxCode] || '').replace(/[^0-9]/g, '')
    if (!raw) continue
    const code = raw.padStart(6, '0')
    const name = r[idxName] || ''
    const delisted = idxDelisted >= 0 ? Boolean((r[idxDelisted] || '').trim()) : false
    out.push({ code, name, mkt: mktId, delisted })
  }
  return out
}

export async function GET() {
  try {
    if (CACHE && Date.now() - CACHE.ts < TTL) {
      return NextResponse.json({ symbols: CACHE.symbols, cached: true })
    }

    // 코스피 + 코스닥 동시 수집
    const [stk, ksq] = await Promise.all([fetchCodes('STK'), fetchCodes('KSQ')])

    // 상폐 제외 & 심볼 접미사 부여
    const symbols = [...stk, ...ksq]
      .filter(s => !s.delisted)
      .map(s => `${s.code}.${s.mkt === 'STK' ? 'KS' : 'KQ'}`)

    // 중복 제거
    const uniq = Array.from(new Set(symbols))

    CACHE = { ts: Date.now(), symbols: uniq }
    return NextResponse.json({ symbols: uniq, cached: false, count: uniq.length })
  } catch (err) {
    console.error('[KRX symbols] error:', err)
    // 실패 시 최소 폴백이라도 리턴
    return NextResponse.json(
      { symbols: ['005930.KS', '000660.KS', '035420.KS', '035720.KS'], cached: false, count: 4 },
      { status: 200 },
    )
  }
}
