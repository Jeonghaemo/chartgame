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
  volumeAreaRatio?: number // 하단 거래량 영역 비율 (기본 0.22 = 22%)
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
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

const nf = new Intl.NumberFormat("ko-KR");

export default function CandleChart({
  data,
  fullForMA,
  height = 640,
  sma = [20, 60, 120, 240],
  showLegend = true,
  showVolume = true,
  trades = [],
  volumeAreaRatio = 0.22,
}: Props) {
  // 루트 + 상/하 영역
  const rootRef = useRef<HTMLDivElement | null>(null);
  const priceRootRef = useRef<HTMLDivElement | null>(null);
  const volRootRef = useRef<HTMLDivElement | null>(null);

  // 차트/시리즈 레퍼런스
  const priceChartRef = useRef<any>(null);
  const volChartRef = useRef<any>(null);
  const candleRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const lineRefs = useRef<Record<string, any>>({});
  const roRef = useRef<ResizeObserver | null>(null);

  // 거래량 라벨 & 세로가이드 라인
  const volLabelRef = useRef<HTMLDivElement | null>(null);
  const vlineRef = useRef<HTMLDivElement | null>(null);

  // ===== 데이터 가공 =====
  const baseAll = useMemo(() => (fullForMA?.length ? fullForMA : data), [fullForMA, data]);
  const baseTs = useMemo(() => baseAll.map(d => toDayTs(d.time)), [baseAll]);
  const baseCloses = useMemo(() => baseAll.map(d => d.close), [baseAll]);

  const candles = useMemo(() => {
    return [...data.map(d => ({
      time: toDayTs(d.time),
      open: d.open, high: d.high, low: d.low, close: d.close
    }))].sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  const volumes = useMemo(() => {
    return [...data.map((d, i) => ({
      time: toDayTs(d.time),
      value: d.volume ?? 0,
      color: i === 0 || d.close >= (data[i - 1]?.close ?? d.close) ? "#ef4444CC" : "#3b82f6CC",
    }))].sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  const volByTime = useMemo(() => {
    const m = new Map<number, number>();
    volumes.forEach(v => m.set(v.time as number, v.value));
    return m;
  }, [volumes]);

  const smaFull = useMemo(() => {
    const out: Record<string, { time: number; value: number }[]> = {};
    for (const p of sma) {
      const arr = calcSMA(baseCloses, p);
      const series: { time: number; value: number }[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] != null) series.push({ time: baseTs[i], value: Number(arr[i]) });
      }
      out[`SMA${p}`] = series;
    }
    return out;
  }, [baseCloses, baseTs, sma]);

  const smaVisible = useMemo(() => {
    const lastTs = candles.length ? (candles[candles.length - 1].time as number) : null;
    const out: Record<string, { time: number; value: number }[]> = {};
    for (const k of Object.keys(smaFull)) {
      out[k] = lastTs == null ? [] : (smaFull[k] ?? []).filter(pt => pt.time <= lastTs);
    }
    return out;
  }, [candles, smaFull]);

  // ===== 초기화(2-패널) =====
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
      if (!priceRootRef.current || !volRootRef.current || !rootRef.current) return;

      const { createChart, ColorType } = window.LightweightCharts;
      const up = "#ef4444", down = "#3b82f6";

      // 영역 높이
      const ratio = Math.max(0.1, Math.min(0.45, volumeAreaRatio ?? 0.22));
      const priceH = Math.round(height * (1 - ratio));
      const volH = Math.max(80, height - priceH);

      // 공통 timeScale 옵션 (양쪽 완전 동일)
      const commonTs = { rightOffset: 0, barSpacing: 6, fixLeftEdge: true, fixRightEdge: true, timeVisible: true, secondsVisible: false };

      // === 위: 가격 차트 ===
      const priceChart = createChart(priceRootRef.current, {
        height: priceH,
        width: priceRootRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        leftPriceScale: { visible: false, borderColor: "#e5e7eb" },
        rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.05, bottom: 0.05 } },
        timeScale: { visible: false, borderColor: "#e5e7eb" },
        // 격자 제거
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: { mode: 1 },
      });
      priceChart.applyOptions({ timeScale: commonTs });

      const candle = priceChart.addCandlestickSeries({
        priceScaleId: "right",
        upColor: up, downColor: down,
        borderUpColor: up, borderDownColor: down,
        wickUpColor: up, wickDownColor: down,
        priceLineVisible: true, lastValueVisible: true,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });

      // SMA (마우스오버 점 제거)
      for (const p of sma) {
        const key = `SMA${p}`;
        const line = priceChart.addLineSeries({
          lineWidth: 2, color: pickSMAColor(key),
          priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        lineRefs.current[key] = line;
      }

      // === 아래: 거래량 차트 ===
      const volChart = createChart(volRootRef.current, {
        height: volH,
        width: volRootRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#6b7280" },
        leftPriceScale:  { visible: false },
        rightPriceScale: { visible: true, borderColor: "#e5e7eb" },
        timeScale: { visible: true,  borderColor: "#e5e7eb" },
        // 격자 제거
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: { mode: 1 },
      });
      volChart.applyOptions({ timeScale: commonTs });

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceLineVisible: false, lastValueVisible: false,
      });
      volSeries.applyOptions({
        autoscaleInfoProvider: (orig: any) => {
          const r = orig();
          if (!r) return r;
          r.priceRange.minValue = 0;
          return r;
        },
      });

      // ==== 스크롤/줌 동기화 (양방향, 끝선 항상 일치) ====
      let syncing = false;
      const syncRange = (src: any, dst: any) => {
        if (syncing) return;
        syncing = true;
        const lr = src.timeScale().getVisibleLogicalRange();
        if (lr) dst.timeScale().setVisibleLogicalRange(lr);
        syncing = false;
      };
      priceChart.timeScale().subscribeVisibleLogicalRangeChange(() => syncRange(priceChart, volChart));
      volChart.timeScale().subscribeVisibleLogicalRangeChange(() => syncRange(volChart, priceChart));

      // ==== 리사이즈 ====
      const placeVolLabel = () => {
        if (!volRootRef.current || !volLabelRef.current) return;
        volLabelRef.current.style.top = `${priceRootRef.current!.clientHeight + 4}px`;
        volLabelRef.current.style.left = "8px";
      };
      const ro = new ResizeObserver(() => {
        const w = rootRef.current?.clientWidth ?? 600;
        const priceH2 = Math.round((rootRef.current?.clientHeight ?? height) * (1 - ratio));
        const volH2 = Math.max(80, (rootRef.current?.clientHeight ?? height) - priceH2);
        priceChart.applyOptions({ width: w, height: priceH2 });
        volChart.applyOptions({ width: w, height: volH2 });
        placeVolLabel();
      });
      ro.observe(rootRef.current!);
      roRef.current = ro;

      // === 공통 세로 가이드 라인 (루트 좌표계) ===
      const vline = document.createElement("div");
      vline.style.position = "absolute";
      vline.style.top = "0";
      vline.style.bottom = "0";
      vline.style.width = "0";
      vline.style.borderRight = "1px dashed rgba(0,0,0,0.22)";
      vline.style.pointerEvents = "none";
      vline.style.display = "none";
      rootRef.current.appendChild(vline);
      vlineRef.current = vline;

      // === 루트 기준 마우스 → 두 차트 동시 적용 (뒤틀림 해결의 핵심) ===
      function handleRootMove(ev: MouseEvent) {
        if (!rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left; // 루트 좌표
        if (x < 0 || x > rect.width) { hideVline(); return; }

        // 세로선 표시
        showVline(Math.round(x));

        // 각 차트 좌표계에서 시간 구해 동일 시간으로 크로스헤어 이동
        const t1 = priceChart.timeScale().coordinateToTime(x);
        const t2 = volChart.timeScale().coordinateToTime(x);

        if (t1 != null) {
          // 가격: 해당 시간 가까운 종가 위치로
          const c = nearestCandleAtTime(candles, t1 as any);
          if (c && candleRef.current) priceChart.setCrosshairPosition(c.close, c.time, candleRef.current);
        }
        if (t2 != null && volSeriesRef.current) {
          const v = nearestVolumeAtTime(volumes, t2 as any);
          if (v) volChart.setCrosshairPosition(v.value, v.time, volSeriesRef.current);
        }
      }
      function showVline(x: number) {
        if (!vlineRef.current) return;
        vlineRef.current.style.left = `${x}px`;
        vlineRef.current.style.display = "block";
      }
      function hideVline() {
        if (!vlineRef.current) return;
        vlineRef.current.style.display = "none";
        // 각 차트 크로스헤어도 숨김
        priceChart.clearCrosshairPosition?.();
        volChart.clearCrosshairPosition?.();
      }

      // 두 패널 모두 루트에 마우스 이벤트 바인딩
      rootRef.current.addEventListener("mousemove", handleRootMove);
      rootRef.current.addEventListener("mouseleave", hideVline);

      // refs 바인딩
      priceChartRef.current = priceChart;
      volChartRef.current   = volChart;
      candleRef.current     = candle;
      volSeriesRef.current  = volSeries;

      // 초기 라벨
      placeVolLabel();
      const lastT = candles.at(-1)?.time as number | undefined;
      if (volLabelRef.current) {
        const v = lastT != null ? volByTime.get(lastT) ?? null : null;
        volLabelRef.current.textContent = `거래량 ${v != null ? nf.format(v) : "-"}`;
      }

      // 언마운트 클린업 핸들러 반환
      return () => {
        rootRef.current?.removeEventListener("mousemove", handleRootMove);
        rootRef.current?.removeEventListener("mouseleave", hideVline);
      };
    };

    const cleanup = init();

    return () => {
      roRef.current?.disconnect();
      if (vlineRef.current?.parentElement) vlineRef.current.parentElement.removeChild(vlineRef.current);
      priceChartRef.current?.remove?.();
      volChartRef.current?.remove?.();
      priceChartRef.current = null;
      volChartRef.current = null;
      candleRef.current = null;
      volSeriesRef.current = null;
      lineRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, showVolume, sma, volumes, volByTime, candles, volumeAreaRatio]);

  // ===== 데이터 바인딩 =====
  useEffect(() => {
    if (!candleRef.current || !priceChartRef.current || !volChartRef.current) return;

    // 가격 차트
    candleRef.current.setData(candles);
    for (const key of Object.keys(lineRefs.current)) {
      lineRefs.current[key].setData(smaVisible[key] ?? []);
    }

    // 거래량 차트
    if (volSeriesRef.current) volSeriesRef.current.setData(volumes);

    // 마커
    if (Array.isArray(trades) && trades.length > 0) {
      const markers = trades.map(t => {
        const tradeTime = toDayTs(t.time);
        const candleMatch = candles.find(c => c.time === tradeTime);
        const matchedTime = candleMatch
          ? candleMatch.time
          : (candles.reduce((prev, curr) =>
              Math.abs((curr.time as number) - tradeTime) <
              Math.abs((prev.time as number) - tradeTime) ? curr : prev
            ).time as number);
        return {
          time: matchedTime,
          position: t.side === "BUY" ? "belowBar" : "aboveBar",
          color: t.side === "BUY" ? "#e63946" : "#457b9d",
          shape: t.side === "BUY" ? "arrowUp" : "arrowDown",
          text: t.side === "BUY" ? "매수" : "매도",
        };
      });
      candleRef.current.setMarkers(markers);
    }

    // ✅ 초기 보이는 구간: 최근 300봉 (양쪽 동일 범위로 강제)
    const n = candles.length;
    if (n > 0) {
      const fromIdx = Math.max(0, n - 300);
      const from = candles[fromIdx].time as number;
      const to   = candles[n - 1].time as number;

      const priceTS = priceChartRef.current.timeScale();
      priceTS.setVisibleRange({ from, to });
      volChartRef.current.timeScale().setVisibleRange({ from, to });
    }
  }, [candles, volumes, smaVisible, trades]);

  // ===== 델타/레전드 =====
  const deltas = useMemo(() => {
    if (data.length < 2) return { o: 0, h: 0, l: 0, c: 0 };
    const last = data[data.length - 1], prev = data[data.length - 2];
    const base = prev.close || 1;
    const pct = (v: number) => ((v - base) / base) * 100;
    return { o: pct(last.open), h: pct(last.high), l: pct(last.low), c: pct(last.close) };
  }, [data]);

  // 전체 래퍼: 상단(가격) + 하단(거래량)
  return (
    <div ref={rootRef} className="relative w-full" style={{ height }}>
      {/* 상단 레전드 */}
      {showLegend && (
        <div
          className="absolute left-2 top-2 z-50 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs rounded-md px-2 py-1 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb", backdropFilter: "blur(2px)", maxWidth: "95%" }}
        >
          <span>시 <Delta v={deltas.o} /></span>
          <span>고 <Delta v={deltas.h} /></span>
          <span>저 <Delta v={deltas.l} /></span>
          <span>종 <Delta v={deltas.c} /></span>
          <span className="text-gray-300">|</span>
          <span className="font-bold text-black">이동평균</span>
          {sma.map(p => (
            <span key={p} className="font-bold" style={{ color: pickSMAColor(`SMA${p}`) }}>{p}</span>
          ))}
        </div>
      )}

      {/* 두 개의 독립 영역 */}
      <div
        ref={priceRootRef}
        className="absolute left-0 right-0 top-0"
        style={{ height: Math.round(height * (1 - (volumeAreaRatio ?? 0.22))) }}
      />
      <div
        ref={volRootRef}
        className="absolute left-0 right-0"
        style={{ bottom: 0, height: Math.max(80, Math.round(height * (volumeAreaRatio ?? 0.22))) }}
      />

      {/* 거래량 라벨: 하단 차트 좌상단 */}
      {showVolume && (
        <div ref={volLabelRef} className="absolute z-40 text-xs text-gray-700" style={{ pointerEvents: "none" }} />
      )}

      {/* 경계선(가독성) */}
      <div
        className="absolute left-0 right-0"
        style={{ top: Math.round(height * (1 - (volumeAreaRatio ?? 0.22))), height: 1, background: "rgba(0,0,0,0.06)", pointerEvents: "none" }}
      />
    </div>
  );
}

/** 같은 시간(또는 가까운 시간)의 캔들/거래량 찾기 */
function nearestCandleAtTime(list: {time:number|any, close:number}[], t:any) {
  // t가 businessDay|UTS 다양한 타입일 수 있어 정수 비교 우선
  const ti = typeof t === "number" ? t : (t?.timestamp ?? undefined);
  if (ti == null) return list.find(c => (c.time as number) === t) ?? list[list.length-1];
  let best = list[0], bd = Math.abs((list[0].time as number) - ti);
  for (const c of list) {
    const d = Math.abs((c.time as number) - ti);
    if (d < bd) { best = c; bd = d; }
  }
  return best;
}
function nearestVolumeAtTime(list: {time:number|any, value:number}[], t:any) {
  const ti = typeof t === "number" ? t : (t?.timestamp ?? undefined);
  if (ti == null) return list.find(v => (v.time as number) === t) ?? list[list.length-1];
  let best = list[0], bd = Math.abs((list[0].time as number) - ti);
  for (const v of list) {
    const d = Math.abs((v.time as number) - ti);
    if (d < bd) { best = v; bd = d; }
  }
  return best;
}

function pickSMAColor(key: string) {
  if (/SMA20/.test(key)) return "#8e24aa";
  if (/SMA60/.test(key)) return "#ff9800";
  if (/SMA120/.test(key)) return "#1976d2";
  if (/SMA240/.test(key)) return "#2e7d32";
  if (/SMA50/.test(key)) return "#6b7280";
  return "#455a64";
}
function Delta({ v }: { v: number }) {
  const cls = v > 0 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-gray-500";
  const sign = v > 0 ? "+" : "";
  return <b className={cls}>{`${sign}${v.toFixed(2)}%`}</b>;
}
