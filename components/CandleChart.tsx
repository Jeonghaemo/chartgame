// components/CandleChart.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";

declare global { interface Window { LightweightCharts?: any } }

export type OHLC = {
  time: number | string;
  open: number; high: number; low: number; close: number;
  volume?: number;
}
type Trade = { time: number | string; side: "BUY" | "SELL" }

type Props = {
  data: OHLC[]
  fullForMA?: OHLC[]
  height?: number
  sma?: number[]
  showLegend?: boolean
  showVolume?: boolean
  trades?: Trade[]
  volumeAreaRatio?: number
  lockToRight?: boolean
  rightWindowBars?: number
}

function toDayTs(t: number | string): number {
  const d = typeof t === "number" ? new Date(t > 1e12 ? t : t * 1000) : new Date(t);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}
function calcSMA(closes: number[], period: number) {
  const out: (number | null)[] = Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = +(sum / period).toFixed(2);
  }
  return out;
}
const nf = new Intl.NumberFormat("ko-KR");
const isValidLR = (lr: any) => lr && lr.from != null && lr.to != null;
const pctStr = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const pctCls = (v: number) => v > 0 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-gray-500";

export default function CandleChart({
  data,
  fullForMA,
  height = 640,
  sma = [5, 10, 20, 60, 120, 240],
  showLegend = true,
  showVolume = true,
  trades = [],
  volumeAreaRatio = 0.24,
  lockToRight = true,
  rightWindowBars = 300,
}: Props) {
  const rootRef      = useRef<HTMLDivElement | null>(null);
  const priceRootRef = useRef<HTMLDivElement | null>(null);
  const volRootRef   = useRef<HTMLDivElement | null>(null);

  const priceChartRef = useRef<any>(null);
  const volChartRef   = useRef<any>(null);
  const candleRef     = useRef<any>(null);
  const volSeriesRef  = useRef<any>(null);
  const lineRefs      = useRef<Record<string, any>>({});
  const roRef         = useRef<ResizeObserver | null>(null);

  // 공용 세로선 + 상단 2줄(OHLC / MA)
  const vlineRef    = useRef<HTMLDivElement | null>(null);
  const hoverRowRef = useRef<HTMLDivElement | null>(null);
  const volLabelRef = useRef<HTMLDivElement | null>(null);

  // 데이터 메모
  const candles = useMemo(() => (
    [...data.map(d => ({
      time: toDayTs(d.time),
      open: d.open, high: d.high, low: d.low, close: d.close,
    }))].sort((a, b) => (a.time as number) - (b.time as number))
  ), [data]);

  const volumes = useMemo(() => (
    [...data.map((d, i) => ({
      time: toDayTs(d.time),
      value: d.volume ?? 0,
      color: i === 0 || d.close >= (data[i - 1]?.close ?? d.close) ? "#ef4444CC" : "#3b82f6CC",
    }))].sort((a, b) => (a.time as number) - (b.time as number))
  ), [data]);

  const baseAll    = useMemo(() => (fullForMA?.length ? fullForMA : data), [fullForMA, data]);
  const baseTs     = useMemo(() => baseAll.map(d => toDayTs(d.time)), [baseAll]);
  const baseCloses = useMemo(() => baseAll.map(d => d.close), [baseAll]);

  const smaFull = useMemo(() => {
    const out: Record<string, { time: number; value: number }[]> = {};
    for (const p of sma) {
      const arr = calcSMA(baseCloses, p);
      const s: { time: number; value: number }[] = [];
      for (let i = 0; i < arr.length; i++) if (arr[i] != null) s.push({ time: baseTs[i], value: Number(arr[i]) });
      out[`SMA${p}`] = s;
    }
    return out;
  }, [baseCloses, baseTs, sma]);

  const smaVisible = useMemo(() => {
    const lastTs = candles.length ? (candles[candles.length - 1].time as number) : null;
    const out: Record<string, { time: number; value: number }[]> = {};
    for (const k of Object.keys(smaFull)) out[k] = lastTs == null ? [] : (smaFull[k] ?? []).filter(pt => pt.time <= lastTs);
    return out;
  }, [candles, smaFull]);

  const candleByTime = useMemo(() => {
    const m = new Map<number, typeof candles[number]>();
    candles.forEach(c => m.set(c.time as number, c));
    return m;
  }, [candles]);
  const idxByTime = useMemo(() => {
    const m = new Map<number, number>();
    candles.forEach((c, i) => m.set(c.time as number, i));
    return m;
  }, [candles]);
  const volByTime = useMemo(() => {
    const m = new Map<number, number>();
    volumes.forEach(v => m.set(v.time as number, v.value));
    return m;
  }, [volumes]);

  // ===== 우측 고정(스팬 기억) =====
  const pinningRef = useRef(false);
  const spanRef = useRef<number>(rightWindowBars); // 현재 화면에 보이는 '봉 개수' 기준
  const pinRight = () => {
    if (!priceChartRef.current || !volChartRef.current) return;
    const last = candles.length - 1;
    if (last < 0) return;
    const span = Math.max(50, Math.min(2000, Math.round(spanRef.current)));
    const from = Math.max(0, last - span);
    const lr   = { from, to: last };
    pinningRef.current = true;
    try {
      priceChartRef.current.timeScale().setVisibleLogicalRange(lr);
      volChartRef.current.timeScale().setVisibleLogicalRange(lr);
    } finally { pinningRef.current = false; }
  };

  // ===== 초기화 =====
  useEffect(() => {
    const init = async () => {
      if (!window.LightweightCharts) {
        await new Promise<void>((resolve, reject) => {
          const id = "lwc-umd";
          if (document.getElementById(id)) {
            const el = document.getElementById(id) as HTMLScriptElement;
            el.addEventListener("load", () => resolve());
            el.addEventListener("error", e => reject(e));
          } else {
            const s = document.createElement("script");
            s.id = id;
            s.src = "https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js";
            s.async = true; s.onload = () => resolve(); s.onerror = (e) => reject(e);
            document.body.appendChild(s);
          }
        });
      }
      if (!rootRef.current || !priceRootRef.current || !volRootRef.current) return;

      const { createChart, ColorType } = window.LightweightCharts;
      const up = "#ef4444", down = "#3b82f6";

      const ratio  = Math.max(0.1, Math.min(0.45, volumeAreaRatio ?? 0.24));
      const plotH  = height;
      const priceH = Math.round(plotH * (1 - ratio));
      const volH   = Math.max(80, plotH - priceH);
      const plotW  = Math.max(0, rootRef.current.clientWidth);

      const commonTS = {
        fixRightEdge: true,
        rightOffset: 0,
        barSpacing: 6,
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#e5e7eb",
      };

      // === 가격 차트 ===
      const priceChart = createChart(priceRootRef.current, {
        height: priceH,
        width : plotW,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        leftPriceScale : { visible: false },
        rightPriceScale: {
          visible: true,
          borderColor: "#e5e7eb",
          minimumWidth: 68,
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: { ...commonTS, visible: false },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          // ✅ 각 차트 자체 세로선은 숨김 (공용 vline만 사용할 것)
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: true, labelVisible: true },
        },
      });

      const candle = priceChart.addCandlestickSeries({
        priceScaleId: "right",
        upColor: up, downColor: down,
        borderUpColor: up, borderDownColor: down,
        wickUpColor: up, wickDownColor: down,
        priceLineVisible: true,
        lastValueVisible: true,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });

      // MA
      for (const p of sma) {
        const key = `SMA${p}`;
        const line = priceChart.addLineSeries({
          priceScaleId: "right",
          lineWidth: 2, color: pickSMAColor(key),
          priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        lineRefs.current[key] = line;
      }

      // === 거래량 차트 ===
      const volChart = createChart(volRootRef.current, {
        height: volH,
        width : plotW,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#6b7280" },
        leftPriceScale : { visible: false },
        rightPriceScale: {
          visible: true,
          borderColor: "#e5e7eb",
          minimumWidth: 68,
        },
        timeScale: { ...commonTS, visible: true },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: true, labelVisible: true },
        },
      });

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
        priceScaleId: "right",
      });
      volSeries.applyOptions({
        autoscaleInfoProvider: (orig: any) => {
          const r = orig(); if (!r) return r;
          r.priceRange.minValue = 0; return r;
        },
      });

      // === 공용 세로 점선 ===
      const vline = document.createElement("div");
      Object.assign(vline.style, {
        position: "absolute", top: "0", bottom: "0", width: "0",
        borderRight: "1px dashed rgba(0,0,0,0.35)",
        pointerEvents: "none",
        display: "none",
        zIndex: "60",                 // ← 캔버스 위로
      } as CSSStyleDeclaration);
      rootRef.current.appendChild(vline);
      vlineRef.current = vline;

      // === 상단 OHLC + MA(2줄) ===
      if (showLegend) {
        const wrap = document.createElement("div");
        wrap.className = [
          "absolute z-50 rounded-lg border border-gray-300",
          "bg-white/95 backdrop-blur px-2 py-1",
          "text-[10px] sm:text-xs md:text-sm",
          "flex flex-col gap-1 pointer-events-none shadow-sm max-w-[96%]",
        ].join(" ");
        Object.assign(wrap.style, { top: "8px", left: "8px" } as CSSStyleDeclaration);

        const hoverRow = document.createElement("div");
        hoverRow.className = "flex flex-wrap items-center gap-x-2 sm:gap-x-3";
        hoverRow.style.display = "none";

        const maRow = document.createElement("div");
        maRow.className = "flex flex-wrap items-center gap-x-2 sm:gap-x-3";
        maRow.innerHTML =
          `<span class="text-gray-700 font-semibold">이동평균</span>` +
          sma.map(p => `<span class="font-bold" style="color:${pickSMAColor(`SMA${p}`)}">${p}</span>`).join("");

        wrap.appendChild(hoverRow);
        wrap.appendChild(maRow);
        priceRootRef.current.appendChild(wrap);

        hoverRowRef.current = hoverRow;
      }

      // === 동기 스크롤/줌 & 우측 고정 가드 ===
      let syncing = false;
      const onLR = (lr: any, fromChart: "price" | "vol") => {
        if (!isValidLR(lr)) return;
        // 줌을 사용했으면 현재 스팬을 새 기준으로 저장
        if (!pinningRef.current) {
          const newSpan = lr.to - lr.from;
          if (newSpan > 5) spanRef.current = newSpan;
        }
        // 우측 고정 유지: 오른쪽 끝에서 떨어지면 다시 붙이기
        if (lockToRight && !pinningRef.current) {
          const last = candles.length - 1;
          if (Math.abs(last - lr.to) > 0.5) { pinRight(); return; }
        }
        // 차트 간 동기화
        if (syncing) return;
        syncing = true;
        try {
          if (fromChart === "price") volChart.timeScale().setVisibleLogicalRange(lr);
          else priceChart.timeScale().setVisibleLogicalRange(lr);
        } finally { syncing = false; }
      };
      priceChart.timeScale().subscribeVisibleLogicalRangeChange((lr: any) => onLR(lr, "price"));
      volChart.timeScale().subscribeVisibleLogicalRangeChange((lr: any) => onLR(lr, "vol"));

      // === 공용 세로선 위치 & 라벨 업데이트 ===
      const showAtTime = (t: any) => {
        if (!t) return;
        const x = priceChart.timeScale().timeToCoordinate(t);
        if (x != null && vlineRef.current) {
          vlineRef.current.style.display = "block";
          vlineRef.current.style.left = `${Math.round(x)}px`;
        }
        const tt = typeof t === "number" ? t : (t?.timestamp ?? t);
        const ci = idxByTime.get(tt);
        const c  = candleByTime.get(tt);
        if (c != null && ci != null && hoverRowRef.current) {
          const prevClose = ci > 0 ? candles[ci - 1].close : c.close;
          const b = prevClose || 1;
          const o = ((c.open  - b) / b) * 100;
          const h = ((c.high  - b) / b) * 100;
          const l = ((c.low   - b) / b) * 100;
          const cc= ((c.close - b) / b) * 100;

          hoverRowRef.current.style.display = "flex";
          hoverRowRef.current.innerHTML =
            `<span>시 <b>${nf.format(c.open)}</b> <b class="${pctCls(o)}">${pctStr(o)}</b></span>` +
            `<span>고 <b>${nf.format(c.high)}</b> <b class="${pctCls(h)}">${pctStr(h)}</b></span>` +
            `<span>저 <b>${nf.format(c.low)}</b>  <b class="${pctCls(l)}">${pctStr(l)}</b></span>` +
            `<span>종 <b>${nf.format(c.close)}</b> <b class="${pctCls(cc)}">${pctStr(cc)}</b></span>`;
        } else if (hoverRowRef.current) {
          hoverRowRef.current.style.display = "none";
        }

        const vv = volByTime.get(tt);
        if (volLabelRef.current) {
          volLabelRef.current.textContent = `거래량 ${vv != null ? nf.format(vv) : "-"}`;
        }
      };
      const hideHover = () => {
        if (vlineRef.current) vlineRef.current.style.display = "none";
        priceChart.clearCrosshairPosition?.();
        volChart.clearCrosshairPosition?.();
        if (hoverRowRef.current) hoverRowRef.current.style.display = "none";
      };
      priceChart.subscribeCrosshairMove(p => { if (!p || p.time == null) { hideHover(); return; } showAtTime(p.time); });
      volChart.subscribeCrosshairMove(p =>   { if (!p || p.time == null) { hideHover(); return; } showAtTime(p.time); });

      // === 리사이즈 ===
      const ro = new ResizeObserver(() => {
        const w  = rootRef.current?.clientWidth ?? 600;
        const priceH2 = Math.round((rootRef.current?.clientHeight ?? height) * (1 - ratio));
        const volH2   = Math.max(80, (rootRef.current?.clientHeight ?? height) - priceH2);
        priceChart.applyOptions({ width: w, height: priceH2 });
        volChart.applyOptions({  width: w, height: volH2  });
        if (lockToRight) pinRight();
      });
      ro.observe(rootRef.current!);
      roRef.current = ro;

      priceChartRef.current = priceChart;
      volChartRef.current   = volChart;
      candleRef.current     = candle;
      volSeriesRef.current  = volSeries;

      // 초기 우측 고정 및 스팬 기록
      if (lockToRight) {
        pinRight();
        const lr = priceChart.timeScale().getVisibleLogicalRange?.();
        if (isValidLR(lr)) spanRef.current = lr.to - lr.from;
      }
      const lastT = candles.at(-1)?.time as number | undefined;
      if (volLabelRef.current) volLabelRef.current.textContent = `거래량 ${lastT ? nf.format(volByTime.get(lastT) ?? 0) : "-"}`;
    };

    const cleanup = init();
    return () => {
      roRef.current?.disconnect();
      if (vlineRef.current?.parentElement) vlineRef.current.parentElement.removeChild(vlineRef.current);
      priceChartRef.current?.remove?.();
      volChartRef.current?.remove?.();
      priceChartRef.current = null;
      volChartRef.current   = null;
      candleRef.current     = null;
      volSeriesRef.current  = null;
      lineRefs.current      = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, volumeAreaRatio, sma, showLegend, lockToRight, rightWindowBars, data, fullForMA]);

  // ===== 데이터 바인딩/마커/고정 =====
  useEffect(() => {
    if (!priceChartRef.current || !volChartRef.current) return;

    candleRef.current?.setData(candles);
    for (const k of Object.keys(lineRefs.current)) lineRefs.current[k].setData(smaVisible[k] ?? []);
    volSeriesRef.current?.setData(volumes);

    if (Array.isArray(trades) && trades.length > 0 && candleRef.current) {
      const markers = trades.map(t => ({
        time: toDayTs(t.time),
        position: t.side === "BUY" ? "belowBar" : "aboveBar",
        color:   t.side === "BUY" ? "#e63946" : "#3b82f6",
        shape:   t.side === "BUY" ? "arrowUp"  : "arrowDown",
        text:    t.side === "BUY" ? "매수" : "매도",
      }));
      candleRef.current.setMarkers(markers);
    } else {
      candleRef.current?.setMarkers([]);
    }

    if (lockToRight) pinRight(); // 새 봉 와도 폭 유지
  }, [candles, volumes, smaVisible, trades, lockToRight]);

  return (
    <div ref={rootRef} className="relative w-full" style={{ height }}>
      {/* 가격 차트 */}
      <div
        ref={priceRootRef}
        className="absolute left-0 right-0 top-0"
        style={{ height: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))) }}
      />
      {/* 거래량 차트 */}
      <div
        ref={volRootRef}
        className="absolute left-0 right-0"
        style={{ bottom: 0, height: Math.max(80, Math.round(height * (volumeAreaRatio ?? 0.24))) }}
      />
      {/* 구분선 & 거래량 최근값 */}
      <div
        className="absolute left-0 right-0"
        style={{ top: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))), height: 1, background: "#e5e7eb", pointerEvents: "none" }}
      />
      {showVolume && (
        <div
          ref={volLabelRef}
          className="absolute z-30 text-xs text-gray-700"
          style={{ pointerEvents: "none", top: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))) + 6, left: 10 }}
        />
      )}
    </div>
  );
}

/* ===== 유틸 ===== */
function pickSMAColor(key: string) {
  if (/SMA5/.test(key)) return "#209733";
  if (/SMA10/.test(key)) return "#0F68FF";
  if (/SMA20/.test(key)) return "#FC542A";
  if (/SMA60/.test(key)) return "#E89732";
  if (/SMA120/.test(key)) return "#A642B9";
  if (/SMA240/.test(key)) return "##323532";
  return "#455a64";
}
