// app/api/history/route.ts

import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

type OHLC = {
  time: number; // seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

// ✅ 하루 기준 (UTC 0시)
function todayMidnightSec() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

function daysAgoSec(n: number) {
  return todayMidnightSec() - n * 86400;
}

async function fetchYahooDaily(symbol: string, period1: number, period2: number): Promise<OHLC[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplit&includePrePost=false`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
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
    if (open[i] == null || high[i] == null || low[i] == null || close[i] == null) continue;

    out.push({
      time: ts[i],
      open: Number(open[i]),
      high: Number(high[i]),
      low: Number(low[i]),
      close: Number(close[i]),
      volume: volume[i] == null ? undefined : Number(volume[i]),
    });
  }
  return out;
}

function getRandomSlice(
  data: OHLC[],
  sliceDays: number = 250,
  gameTurns: number = 60
): {
  gameData: OHLC[];
  startIndex: number;
  totalAvailable: number;
  fixedStart: number;
} {
  const totalLen = data.length;
  const totalNeeded = sliceDays + gameTurns;

  if (totalLen < totalNeeded) {
    const maxStart = Math.max(0, totalLen - gameTurns - 1);
    const startIndex = Math.floor(Math.random() * (maxStart + 1));
    return {
      gameData: data,
      startIndex,
      totalAvailable: totalLen,
      fixedStart: 0,
    };
  }

  const maxStartPoint = totalLen - totalNeeded;
  const nowSeed = Date.now() + Math.floor(Math.random() * 100_000); // ✅ 더 강한 시드
  const randomStart = nowSeed % (maxStartPoint + 1);
  const slicedData = data.slice(randomStart, randomStart + totalNeeded);

  return {
    gameData: slicedData,
    startIndex: sliceDays - 1,
    totalAvailable: totalLen,
    fixedStart: randomStart,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lowerBoundByTs(arr: OHLC[], target: number) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].time < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") ?? "005930.KS";
    const lookbackDays = Number(url.searchParams.get("days") ?? "3650");
    const sliceDays = Number(url.searchParams.get("slice") ?? "365");
    const gameTurns = Number(url.searchParams.get("turns") ?? "60");

    // ✅ 하루 단위 기준
    const todaySec = todayMidnightSec();
    const period1 = Number(url.searchParams.get("period1") ?? todaySec - lookbackDays * 86400);
    const period2 = Number(url.searchParams.get("period2") ?? todaySec + 86400);

    const startIndexParam = url.searchParams.get("startIndex");
    const sliceStartParam = url.searchParams.get("sliceStart");
    const sliceStartTsParam = url.searchParams.get("sliceStartTs");

    let ohlc = await fetchYahooDaily(symbol, period1, period2);

    const byTs = new Map<number, OHLC>();
    for (const r of ohlc) byTs.set(r.time, r);
    ohlc = Array.from(byTs.values()).sort((a, b) => a.time - b.time);

    const totalNeeded = sliceDays + gameTurns;

    // 복원 처리
    if (startIndexParam != null && (sliceStartParam != null || sliceStartTsParam != null)) {
      let fixedStart = 0;
      if (sliceStartParam != null) {
        fixedStart = clamp(Number(sliceStartParam), 0, Math.max(0, ohlc.length - totalNeeded));
      } else {
        const anchorTs = Number(sliceStartTsParam);
        const idx = lowerBoundByTs(ohlc, anchorTs);
        fixedStart = clamp(idx, 0, Math.max(0, ohlc.length - totalNeeded));
      }

      const gameData = ohlc.slice(fixedStart, fixedStart + totalNeeded);
      const startIndex = clamp(Number(startIndexParam), 0, Math.max(0, sliceDays - 1));
      const initialChartData = gameData.slice(0, startIndex + 1);

      return NextResponse.json({
        ok: true,
        source: "yahoo",
        symbol,
        ohlc: gameData,
        initialChart: initialChartData,
        startIndex,
        count: gameData.length,
        meta: {
          sliceDays,
          gameTurns,
          totalAvailableData: ohlc.length,
          fixedStart,
          fixedStartTs: gameData[0]?.time ?? null,
          sliceStartISO: gameData[0]
            ? new Date(gameData[0].time * 1000).toISOString().split("T")[0]
            : null,
          sliceEndISO: gameData.at(-1)
            ? new Date(gameData.at(-1)!.time * 1000).toISOString().split("T")[0]
            : null,
        },
      });
    }

    // 랜덤 새 게임 처리
    const {
      gameData,
      startIndex,
      totalAvailable,
      fixedStart: randomFixedStart,
    } = getRandomSlice(ohlc, sliceDays, gameTurns);
    const initialChartData = gameData.slice(0, startIndex + 1);

    return NextResponse.json({
      ok: true,
      source: "yahoo",
      symbol,
      ohlc: gameData,
      initialChart: initialChartData,
      startIndex,
      count: gameData.length,
      meta: {
        sliceDays,
        gameTurns,
        totalAvailableData: totalAvailable,
        fixedStart: randomFixedStart,
        fixedStartTs: gameData[0]?.time ?? null,
        sliceStartISO: gameData[0]
          ? new Date(gameData[0].time * 1000).toISOString().split("T")[0]
          : null,
        sliceEndISO: gameData.at(-1)
          ? new Date(gameData.at(-1)!.time * 1000).toISOString().split("T")[0]
          : null,
      },
    });
  } catch (err: any) {
    console.error("[/api/history] error:", err?.message || err);
    return NextResponse.json(
      { ok: false, symbol: null, ohlc: [], initialChart: [], startIndex: 0 },
      { status: 200 }
    );
  }
}
