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

function nowSec() {
  return Math.floor(Date.now() / 1000);
}
function daysAgoSec(n: number) {
  return nowSec() - n * 86400;
}

async function fetchYahooDaily(
  symbol: string,
  period1: number,
  period2: number
): Promise<OHLC[]> {
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
    if (
      open[i] == null ||
      high[i] == null ||
      low[i] == null ||
      close[i] == null
    )
      continue;

    out.push({
      time: ts[i], // seconds (UTC)
      open: Number(open[i]),
      high: Number(high[i]),
      low: Number(low[i]),
      close: Number(close[i]),
      volume: volume[i] == null ? undefined : Number(volume[i]),
    });
  }
  return out;
}

/**
 * 랜덤 슬라이스 생성 (기본: 365일 표시 + 60턴 진행 = 425캔들 필요)
 * 반환:
 *  - gameData: 잘린 데이터(또는 전체)
 *  - startIndex: 보이는 365일의 마지막 인덱스(0-based)
 *  - totalAvailable: 전체 길이
 *  - fixedStart: 원본 ohlc 기준 절대 시작 인덱스(앵커)
 */
function getRandomSlice(
  data: OHLC[],
  sliceDays: number = 365,
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
    // 데이터가 부족하면 전체 반환. 게임 커서는 랜덤, 고정 시작은 0.
    const maxStart = Math.max(0, totalLen - gameTurns - 1);
    const startIndex = Math.floor(Math.random() * (maxStart + 1));
    return {
      gameData: data,
      startIndex,
      totalAvailable: totalLen,
      fixedStart: 0,
    };
  }

  // 마지막에서 totalNeeded만큼 여유를 두고 랜덤 시작
  const maxStartPoint = totalLen - totalNeeded;
  const randomStart = Math.floor(Math.random() * (maxStartPoint + 1));
  const slicedData = data.slice(randomStart, randomStart + totalNeeded);

  return {
    gameData: slicedData,
    startIndex: sliceDays - 1, // 365번째 캔들에서 시작
    totalAvailable: totalLen,
    fixedStart: randomStart, // 절대 시작 인덱스(앵커)
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 이분 탐색: target TS 이상이 처음 나오는 인덱스
function lowerBoundByTs(arr: OHLC[], target: number) {
  let lo = 0,
    hi = arr.length; // [lo, hi)
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

    const period1 = Number(
      url.searchParams.get("period1") ?? daysAgoSec(lookbackDays)
    );
    const period2 = Number(
      url.searchParams.get("period2") ?? nowSec() + 86400
    );

    // 복원용 파라미터
    const startIndexParam = url.searchParams.get("startIndex"); // 커서 초기 위치(365일 창의 끝)
    const sliceStartParam = url.searchParams.get("sliceStart"); // 절대 시작 인덱스(원본 ohlc 기준)
    const sliceStartTsParam = url.searchParams.get("sliceStartTs"); // 절대 시작 TS(초)

    // 1) 시세 로드
    let ohlc = await fetchYahooDaily(symbol, period1, period2);

    // 2) 중복 제거 + 정렬
    const byTs = new Map<number, OHLC>();
    for (const r of ohlc) byTs.set(r.time, r);
    ohlc = Array.from(byTs.values()).sort((a, b) => a.time - b.time);

    const totalNeeded = sliceDays + gameTurns;

    // 3) 복원 분기: startIndex + (sliceStart | sliceStartTs)가 오면 고정 구간을 동일하게 잘라 준다
    if (
      startIndexParam != null &&
      (sliceStartParam != null || sliceStartTsParam != null)
    ) {
      // 시작점 계산
      let fixedStart = 0;
      if (sliceStartParam != null) {
        fixedStart = clamp(
          Number(sliceStartParam),
          0,
          Math.max(0, ohlc.length - totalNeeded)
        );
      } else {
        // sliceStartTs → 가장 가까운 인덱스
        const anchorTs = Number(sliceStartTsParam);
        const idx = lowerBoundByTs(ohlc, anchorTs);
        fixedStart = clamp(idx, 0, Math.max(0, ohlc.length - totalNeeded));
      }

      const gameData = ohlc.slice(fixedStart, fixedStart + totalNeeded);
      const startIndex = clamp(
        Number(startIndexParam),
        0,
        Math.max(0, sliceDays - 1)
      );
      const initialChartData = gameData.slice(0, startIndex + 1);

      return NextResponse.json({
        ok: true,
        source: "yahoo",
        symbol,
        ohlc: gameData,
        initialChart: initialChartData,
        startIndex, // 365일 창의 끝(커서 초기 위치)
        count: gameData.length,
        meta: {
          sliceDays,
          gameTurns,
          totalAvailableData: ohlc.length,
          fixedStart, // 절대 시작 인덱스(앵커)
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

    // 4) 새 게임(랜덤) 분기
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
        fixedStart: randomFixedStart, // ← 이 값을 클라가 저장했다가 새로고침 시 전달
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
