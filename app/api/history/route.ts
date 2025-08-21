// app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number };

function nowSec() {
  return Math.floor(Date.now() / 1000);
}
function daysAgoSec(n: number) {
  return nowSec() - n * 86400;
}

async function fetchYahooDaily(symbol: string, period1: number, period2: number): Promise<OHLC[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplit&includePrePost=false`;

  const res = await fetch(url, {
    headers: {
      // 일부 환경에서 필요 없음. 프록시 없이도 잘 동작.
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
    // 캐싱(5분)
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const ts: number[] = result.timestamp || []; // unix seconds (UTC)
  const quote = result.indicators?.quote?.[0] || {};
  const open: (number | null)[] = quote.open || [];
  const high: (number | null)[] = quote.high || [];
  const low: (number | null)[] = quote.low || [];
  const close: (number | null)[] = quote.close || [];
  const volume: (number | null)[] = quote.volume || [];

  const out: OHLC[] = [];
  for (let i = 0; i < ts.length; i++) {
    // 휴일 등 null 데이터 제거
    if (
      open[i] == null ||
      high[i] == null ||
      low[i] == null ||
      close[i] == null
    ) continue;

    out.push({
      time: ts[i],                               // <- 프론트에서 BusinessDay로 매핑
      open: Number(open[i]),
      high: Number(high[i]),
      low: Number(low[i]),
      close: Number(close[i]),
      volume: volume[i] == null ? undefined : Number(volume[i]),
    });
  }
  return out;
}

// app/api/history/route.ts (보완 포인트만)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") ?? "005930.KS";
    const lookbackDays = Number(url.searchParams.get("days") ?? "3650");
    const p1 = Number(url.searchParams.get("period1") ?? daysAgoSec(lookbackDays));
    // ✅ Yahoo end exclusive 대비 하루 여유
    const p2 = Number(url.searchParams.get("period2") ?? (nowSec() + 86400));

    let ohlc = await fetchYahooDaily(symbol, p1, p2);

    // ✅ 혹시 모를 타임스탬프 꼬임/중복 정리(오름차순 + 중복 제거: 최신 우선)
    const byTs = new Map<number, OHLC>();
    for (const r of ohlc) byTs.set(r.time, r);
    ohlc = Array.from(byTs.values()).sort((a, b) => a.time - b.time);

    return NextResponse.json(
      { ok: true, source: "yahoo", symbol, ohlc, count: ohlc.length },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    console.error("[/api/history] error:", err?.message || err);
    return NextResponse.json({ ok: false, symbol: null, ohlc: [] }, { status: 200 });
  }
}

