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
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const ts: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const open: (number | null)[] = quote.open || [];
  const high: (number | null)[] = quote.high || [];
  const low: (number | null)[] = quote.low || [];
  const close: (number | null)[] = quote.close || [];
  const volume: (number | null)[] = quote.volume || [];

  const out: OHLC[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (
      open[i] == null ||
      high[i] == null ||
      low[i] == null ||
      close[i] == null
    ) continue;

    out.push({
      time: ts[i], // timestamp in seconds UTC
      open: Number(open[i]),
      high: Number(high[i]),
      low: Number(low[i]),
      close: Number(close[i]),
      volume: volume[i] == null ? undefined : Number(volume[i]),
    });
  }
  return out;
}

function getRandomSlice(data: OHLC[], sliceDays: number = 365, gameTurns: number = 60): { 
  gameData: OHLC[], 
  startIndex: number,
  totalAvailable: number 
} {
  const totalLen = data.length;
  const totalNeeded = sliceDays + gameTurns; // 365일 + 60일 = 425일 필요
  
  if (totalLen < totalNeeded) {
    // 데이터가 부족하면 전체를 반환하고 startIndex를 조정
    const maxStart = Math.max(0, totalLen - gameTurns - 1);
    const startIndex = Math.floor(Math.random() * (maxStart + 1));
    return {
      gameData: data,
      startIndex,
      totalAvailable: totalLen
    };
  }
  
  // 랜덤 시작점 선택 (마지막에서 totalNeeded만큼 여유 두기)
  const maxStartPoint = totalLen - totalNeeded;
  const randomStart = Math.floor(Math.random() * (maxStartPoint + 1));
  
  // 365일 + 60일 슬라이스
  const slicedData = data.slice(randomStart, randomStart + totalNeeded);
  
  return {
    gameData: slicedData,
    startIndex: sliceDays - 1, // 365번째 인덱스부터 게임 시작 (0-based)
    totalAvailable: totalLen
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") ?? "005930.KS";
    const lookbackDays = Number(url.searchParams.get("days") ?? "3650");
    const sliceDays = Number(url.searchParams.get("slice") ?? "365"); // 차트에 보여줄 일수
    const gameTurns = Number(url.searchParams.get("turns") ?? "60"); // 게임 턴 수

    const period1 = Number(url.searchParams.get("period1") ?? daysAgoSec(lookbackDays));
    const period2 = Number(url.searchParams.get("period2") ?? (nowSec() + 86400));

    let ohlc = await fetchYahooDaily(symbol, period1, period2);

    // 중복제거 및 정렬 (오래된 순)
    const byTs = new Map<number, OHLC>();
    for (const r of ohlc) byTs.set(r.time, r);
    ohlc = Array.from(byTs.values()).sort((a, b) => a.time - b.time);

    // 랜덤 슬라이스 생성
    const { gameData, startIndex, totalAvailable } = getRandomSlice(ohlc, sliceDays, gameTurns);

    // 초기 차트용 데이터 (startIndex까지만)
    const initialChartData = gameData.slice(0, startIndex + 1);

    return NextResponse.json(
      { 
        ok: true, 
        source: "yahoo", 
        symbol, 
        ohlc: gameData, // 전체 게임 데이터 (365 + 60일)
        initialChart: initialChartData, // 초기 차트 데이터 (365일)
        startIndex, // 게임 시작 인덱스
        count: gameData.length,
        meta: {
          sliceDays,
          gameTurns,
          totalAvailableData: totalAvailable,
          sliceStart: gameData[0]?.time ? new Date(gameData[0].time * 1000).toISOString().split('T')[0] : null,
          sliceEnd: gameData[gameData.length - 1]?.time ? new Date(gameData[gameData.length - 1].time * 1000).toISOString().split('T')[0] : null
        }
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
    
  } catch (err: any) {
    console.error("[/api/history] error:", err?.message || err);
    return NextResponse.json({ ok: false, symbol: null, ohlc: [], initialChart: [], startIndex: 0 }, { status: 200 });
  }
}