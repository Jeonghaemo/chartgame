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
  gutter?: number
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
const abbr = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n/1e9).toFixed(2)}b`;
  if (abs >= 1e6) return `${(n/1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `${(n/1e3).toFixed(0)}k`;
  return nf.format(n);
};

export default function CandleChart({
  data,
  fullForMA,
  height = 640,
  sma = [20, 60, 120, 240],
  showLegend = true,
  showVolume = true,
  trades = [],
  volumeAreaRatio = 0.24,
  gutter = 64,
}: Props) {
  // 레이아웃 refs
  const plotRef      = useRef<HTMLDivElement | null>(null);
  const priceRootRef = useRef<HTMLDivElement | null>(null);
  const volRootRef   = useRef<HTMLDivElement | null>(null);

  // 차트 refs
  const priceChartRef = useRef<any>(null);
  const volChartRef   = useRef<any>(null);
  const candleRef     = useRef<any>(null);
  const volSeriesRef  = useRef<any>(null);
  const lineRefs      = useRef<Record<string, any>>({});
  const roRef         = useRef<ResizeObserver | null>(null);

  // 오버레이 DOM
  const vlineRef      = useRef<HTMLDivElement | null>(null);
  const volHoverRef   = useRef<HTMLDivElement | null>(null);
  const volLabelRef   = useRef<HTMLDivElement | null>(null);

  // 상단 2줄 컨테이너(1줄=OHLC hover, 2줄=SMA 라벨)
  const legendWrapRef = useRef<HTMLDivElement | null>(null);
  const hoverRowRef   = useRef<HTMLDivElement | null>(null);
  const maRowRef      = useRef<HTMLDivElement | null>(null);

  // ➕ 우측 버블(주가/거래량)
  const priceBubbleRef = useRef<HTMLDivElement | null>(null);
  const volBubbleRef   = useRef<HTMLDivElement | null>(null);

  // ===== 데이터 =====
  const baseAll    = useMemo(() => (fullForMA?.length ? fullForMA : data), [fullForMA, data]);
  const baseTs     = useMemo(() => baseAll.map(d => toDayTs(d.time)), [baseAll]);
  const baseCloses = useMemo(() => baseAll.map(d => d.close), [baseAll]);

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

  const volByTime = useMemo(() => {
    const m = new Map<number, number>();
    volumes.forEach(v => m.set(v.time as number, v.value));
    return m;
  }, [volumes]);

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
      if (!plotRef.current || !priceRootRef.current || !volRootRef.current) return;

      const { createChart, ColorType } = window.LightweightCharts;
      const up = "#ef4444", down = "#3b82f6";

      const ratio  = Math.max(0.1, Math.min(0.45, volumeAreaRatio ?? 0.24));
      const plotH  = height;
      const priceH = Math.round(plotH * (1 - ratio));
      const volH   = Math.max(80, plotH - priceH);

      const plotRect = plotRef.current.getBoundingClientRect();
      const plotW    = Math.max(0, Math.floor(plotRect.width));

      const timeScaleOpts = {
        rightOffset: 0,
        barSpacing: 6,
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#e5e7eb",
      };

      // 가격 차트
      const priceChart = createChart(priceRootRef.current, {
        height: priceH,
        width : plotW,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        leftPriceScale : { visible: false },
        rightPriceScale: { visible: false },
        timeScale: { ...timeScaleOpts, visible: false },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { visible: true, labelVisible: false, width: 0 },
          horzLine: { visible: true, labelVisible: true },
        },
      });

      const candle = priceChart.addCandlestickSeries({
        priceScaleId: "right",
        upColor: up, downColor: down,
        borderUpColor: up, borderDownColor: down,
        wickUpColor: up, wickDownColor: down,
        priceLineVisible: true, lastValueVisible: true,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });

      // SMA 라인
      for (const p of sma) {
        const key = `SMA${p}`;
        const line = priceChart.addLineSeries({
          lineWidth: 2, color: pickSMAColor(key),
          priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        lineRefs.current[key] = line;
      }

      // 거래량 차트
      const volChart = createChart(volRootRef.current, {
        height: volH,
        width : plotW,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#6b7280" },
        leftPriceScale : { visible: false },
        rightPriceScale: { visible: false },
        timeScale: { ...timeScaleOpts, visible: true },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { visible: true, labelVisible: false, width: 0 },
          horzLine: { visible: false, labelVisible: false },
        },
      });

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceLineVisible: false, lastValueVisible: false,
      });
      volSeries.applyOptions({
        autoscaleInfoProvider: (orig: any) => {
        const r = orig(); if (!r) return r;
        r.priceRange.minValue = 0; return r;
      }});

      // 공통 세로선(플롯 기준)
      const vline = document.createElement("div");
      Object.assign(vline.style, {
        position: "absolute", top: "0", bottom: "0", width: "0",
        borderRight: "1px dashed rgba(0,0,0,0.28)", pointerEvents: "none", display: "none",
      } as CSSStyleDeclaration);
      plotRef.current.appendChild(vline);
      vlineRef.current = vline;

      // === 상단 2줄 컨테이너(1줄=OHLC+%, 2줄=SMA 라벨) ===
      if (showLegend) {
        const wrap = document.createElement("div");
        wrap.className = [
          "absolute z-50",
          "rounded-lg border border-gray-300",
          "bg-white/95 backdrop-blur",
          "px-2 py-1",
          "text-[10px] sm:text-xs md:text-sm",
          "flex flex-col gap-1",
          "pointer-events-none",
          "shadow-sm",
          "max-w-[96%]"
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
        plotRef.current.appendChild(wrap);

        legendWrapRef.current = wrap;
        hoverRowRef.current   = hoverRow;
        maRowRef.current      = maRow;
      }

      // === 우측 가격/볼륨 버블 생성 ===
      const makeBubble = (parent: HTMLElement) => {
        const box = document.createElement("div");
        box.className = "absolute z-50 text-[10px] sm:text-xs md:text-sm font-semibold";
        Object.assign(box.style, {
          right: "8px",
          transform: "translateY(-50%)",
          display: "none",
          padding: "4px 8px",
          borderRadius: "8px",
          background: "#3b5ccc",   // 파란 배경
          color: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
        } as CSSStyleDeclaration);

        // 작은 화살표
        const arrow = document.createElement("div");
        Object.assign(arrow.style, {
          position: "absolute",
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "0", height: "0",
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "6px solid #3b5ccc"
        } as CSSStyleDeclaration);
        box.appendChild(arrow);

        parent.appendChild(box);
        return box;
      };
      const priceBubble = makeBubble(priceRootRef.current);
      const volumeBubble = makeBubble(volRootRef.current);
      priceBubbleRef.current = priceBubble;
      volBubbleRef.current   = volumeBubble;

      // 논리범위 동기화
      let syncing = false;
      const priceToVol = (lr: any) => {
        if (syncing || !isValidLR(lr)) return;
        syncing = true; try { volChart.timeScale().setVisibleLogicalRange(lr); } finally { syncing = false; }
      };
      const volToPrice = (lr: any) => {
        if (syncing || !isValidLR(lr)) return;
        syncing = true; try { priceChart.timeScale().setVisibleLogicalRange(lr); } finally { syncing = false; }
      };
      (priceChart as any).__onLR = priceToVol;
      (volChart as any).__onLR   = volToPrice;

      // === 크로스헤어 이동 시: 상단 1줄(OHLC) + 우측 버블 2개 + 거래량 라벨 ===
      const showAtTime = (t: any, from: "price" | "volume") => {
        if (!t) return;
        // 공통 X 세로선
        const x = priceChart.timeScale().timeToCoordinate(t);
        if (x != null && vlineRef.current) {
          vlineRef.current.style.display = "block";
          vlineRef.current.style.left = `${Math.round(x)}px`;
        }

        const tt = typeof t === "number" ? t : (t?.timestamp ?? t);
        const ci = idxByTime.get(tt);
        const c  = candleByTime.get(tt);

        // (1) 상단 1줄: OHLC(가격 + %)
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

        // (2) 우측 가격 버블
        if (c && priceBubbleRef.current && candleRef.current) {
          const y = candleRef.current.priceToCoordinate(c.close);
          if (y != null) {
            priceBubbleRef.current.style.display = "block";
            priceBubbleRef.current.style.top = `${Math.round(y)}px`;
            priceBubbleRef.current.textContent = nf.format(c.close);
          }
        }

        // (3) 우측 거래량 버블 + 하단 라벨
        const vv = volByTime.get(tt);
        if (vv != null) {
          if (volBubbleRef.current && volSeriesRef.current) {
            const yv = volSeriesRef.current.priceToCoordinate(vv);
            if (yv != null) {
              volBubbleRef.current.style.display = "block";
              volBubbleRef.current.style.top = `${Math.round(yv)}px`;
              volBubbleRef.current.textContent = abbr(vv);
            }
          }
          if (volHoverRef.current) {
            volHoverRef.current.style.display = "block";
            volHoverRef.current.textContent = `거래량 ${nf.format(vv)}`;
          }
        } else {
          if (volBubbleRef.current) volBubbleRef.current.style.display = "none";
          if (volHoverRef.current)  volHoverRef.current.style.display  = "none";
        }
      };

      const hideHover = () => {
        if (vlineRef.current) vlineRef.current.style.display = "none";
        priceChart.clearCrosshairPosition?.();
        volChart.clearCrosshairPosition?.();
        if (hoverRowRef.current) hoverRowRef.current.style.display = "none";
        if (volHoverRef.current)  volHoverRef.current.style.display  = "none";
        if (priceBubbleRef.current) priceBubbleRef.current.style.display = "none";
        if (volBubbleRef.current)   volBubbleRef.current.style.display   = "none";
      };

      priceChart.subscribeCrosshairMove((p: any) => {
        if (!p || p.time == null) { hideHover(); return; }
        showAtTime(p.time, "price");
      });
      volChart.subscribeCrosshairMove((p: any) => {
        if (!p || p.time == null) { hideHover(); return; }
        showAtTime(p.time, "volume");
      });

      // 리사이즈
      const ro = new ResizeObserver(() => {
        const plotW2  = Math.max(0, Math.floor(plotRef.current?.getBoundingClientRect().width ?? 600));
        const priceH2 = Math.round((plotRef.current?.clientHeight ?? height) * (1 - ratio));
        const volH2   = Math.max(80, (plotRef.current?.clientHeight ?? height) - priceH2);
        priceChart.applyOptions({ width: plotW2, height: priceH2 });
        volChart.applyOptions({  width: plotW2, height: volH2  });
        if (volHoverRef.current) volHoverRef.current.style.top = `${priceH2 + 8}px`;
      });
      ro.observe(plotRef.current!);
      roRef.current = ro;

      // refs
      priceChartRef.current = priceChart;
      volChartRef.current   = volChart;
      candleRef.current     = candle;
      volSeriesRef.current  = volSeries;

      // 하단 기본 거래량 라벨(최근 값)
      const lastT = candles.at(-1)?.time as number | undefined;
      if (lastT != null && volLabelRef.current) {
        const v = volByTime.get(lastT);
        volLabelRef.current.textContent = `거래량 ${v != null ? nf.format(v) : "-"}`;
      }
    };

    const cleanup = init();
    return () => {
      roRef.current?.disconnect();
      [vlineRef, volHoverRef, legendWrapRef, priceBubbleRef, volBubbleRef].forEach(r => {
        if (r.current?.parentElement) r.current.parentElement.removeChild(r.current);
      });
      priceChartRef.current?.remove?.();
      volChartRef.current?.remove?.();
      priceChartRef.current = null;
      volChartRef.current   = null;
      candleRef.current     = null;
      volSeriesRef.current  = null;
      lineRefs.current      = {};
      hoverRowRef.current   = null;
      maRowRef.current      = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, volumeAreaRatio, gutter, data, sma, showLegend]);

  // ===== 데이터 바인딩 + 마커 + 범위/구독 =====
  useEffect(() => {
    if (!candleRef.current || !priceChartRef.current || !volChartRef.current) return;

    candleRef.current.setData(candles);
    for (const k of Object.keys(lineRefs.current)) lineRefs.current[k].setData(smaVisible[k] ?? []);
    if (volSeriesRef.current) volSeriesRef.current.setData(volumes);

    // 매수/매도 마커
    if (Array.isArray(trades) && trades.length > 0) {
      const markers = trades.map(t => {
        const ts = toDayTs(t.time);
        return {
          time: snapNearest(candles, ts),
          position: t.side === "BUY" ? "belowBar" : "aboveBar",
          color:   t.side === "BUY" ? "#e63946" : "#3b82f6",
          shape:   t.side === "BUY" ? "arrowUp"  : "arrowDown",
          text:    t.side === "BUY" ? "매수" : "매도",
        };
      });
      candleRef.current.setMarkers(markers);
    } else {
      candleRef.current.setMarkers([]);
    }

    // 초기 논리범위(최근 300봉)
    if (candles.length) {
      const fromIdx = Math.max(0, candles.length - 300);
      const lr = { from: fromIdx, to: candles.length - 1 };
      priceChartRef.current.timeScale().setVisibleLogicalRange(lr);
      volChartRef.current.timeScale().setVisibleLogicalRange(lr);
    }

    const priceTS = priceChartRef.current.timeScale();
    const volTS   = volChartRef.current.timeScale();
    const onPL = (priceChartRef.current as any).__onLR;
    const onVL = (volChartRef.current  as any).__onLR;
    if (onPL) priceTS.subscribeVisibleLogicalRangeChange(onPL);
    if (onVL) volTS.subscribeVisibleLogicalRangeChange(onVL);

    return () => {
      if (onPL) priceTS.unsubscribeVisibleLogicalRangeChange(onPL);
      if (onVL) volTS.unsubscribeVisibleLogicalRangeChange(onVL);
    };
  }, [candles, volumes, smaVisible, trades]);

  return (
    <div className="w-full" style={{ height }}>
      {/* grid: 플롯(1fr) + 공용 거터 */}
      <div className="grid h-full overflow-hidden box-border" style={{ gridTemplateColumns: `1fr ${gutter}px` }}>
        {/* 플롯 컬럼 */}
        <div ref={plotRef} className="relative h-full">
          {/* 상단 영역 */}
          <div
            ref={priceRootRef}
            className="absolute left-0 right-0 top-0 box-border"
            style={{ height: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))) }}
          />
          {/* 하단 영역 */}
          <div
            ref={volRootRef}
            className="absolute left-0 right-0 box-border"
            style={{ bottom: 0, height: Math.max(80, Math.round(height * (volumeAreaRatio ?? 0.24))) }}
          />

          {/* 기본 거래량 라벨(최근 값) */}
          {showVolume && (
            <div
              ref={volLabelRef}
              className="absolute z-30 text-[10px] sm:text-xs md:text-sm text-gray-700"
              style={{ pointerEvents: "none", top: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))) + 6, left: 10 }}
            />
          )}

          {/* 상/하 구분선 */}
          <div
            className="absolute left-0 right-0"
            style={{ top: Math.round(height * (1 - (volumeAreaRatio ?? 0.24))), height: 1, background: "#d1d5db", pointerEvents: "none" }}
          />
        </div>

        {/* 공용 Y축 거터 */}
        <div className="relative h-full border-l" style={{ borderColor: "#e5e7eb" }} />
      </div>
    </div>
  );
}

/* ===== 유틸 ===== */
function pickSMAColor(key: string) {
  if (/SMA20/.test(key)) return "#8e24aa";
  if (/SMA60/.test(key)) return "#ff9800";
  if (/SMA120/.test(key)) return "#1976d2";
  if (/SMA240/.test(key)) return "#2e7d32";
  if (/SMA50/.test(key)) return "#6b7280";
  return "#455a64";
}
function snapNearest(list: { time:number|any }[], t:number) {
  if (!list.length) return t;
  let best = list[0].time as number, bd = Math.abs((list[0].time as number) - t);
  for (const c of list) {
    const d = Math.abs((c.time as number) - t);
    if (d < bd) { best = c.time as number; bd = d; }
  }
  return best;
}
