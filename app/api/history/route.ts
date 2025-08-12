import { NextRequest, NextResponse } from "next/server";

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume?: number };

function genSeries(days = 400, start = 50000): OHLC[] {
  const out: OHLC[] = [];
  let px = start;
  for (let i = 0; i < days; i++) {
    const t = Math.floor(Date.now() / 1000) - (days - i) * 86400;
    const drift = 1 + (Math.random() - 0.5) * 0.02; // ±1%
    const open = px;
    const close = Math.max(100, open * drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(100000 + Math.random() * 200000);
    out.push({ time: t, open, high, low, close, volume });
    px = close;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") ?? "005930.KS";
  const ohlc = genSeries(500, 60000 + Math.random() * 30000);
  return NextResponse.json({ symbol, ohlc });
}
