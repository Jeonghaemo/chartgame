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
  volumeAreaRatio?: number // 하단 거래량 영역 비율 (기본 0.22)
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

  // 차트 refs
  const priceChartRef = useRef<any>(null);
  const volChartRef   = useRef<any>(null);
  const candleRef     = useRef<any>(null);
  const volSeriesRef  = useRef<any>(null);
  const lineRefs      = useRef<Record<string, any>>({});
  const roRef         = useRef<ResizeObserver | null>(null);

  // 오버레이 DOM
  const vlineRef       = useRef<HTMLDivElement | null>(null); // 공통 세로선
  const priceHoverRef  = useRef<HTMLDivElement | null>(null); // OHLC 라벨
  const volHoverRef    = useRef<HTMLDivElement | null>(null); // 거래량 라벨
  const volLabelRef    = useRef<HTMLDivElement | null>(null); // 하단(마지막 값) 기본 라벨

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
      if (!priceRootRef.current || !volRootRef.current || !rootRef.current) return;

      const { createChart, ColorType } = window.LightweightCharts;
      const up = "#ef4444", down = "#3b82f6";

      const ratio  = Math.max(0.1, Math.min(0.45, volumeAreaRatio ?? 0.22));
      const priceH = Math.round(height * (1 - ratio));
      const volH   = Math.max(80, height - priceH);

      const commonTs = {
        rightOffset: 0,
        barSpacing: 6,
        fixLeftEdge: true,
        fixRightEdge: true,   // 오른쪽 여백 제거
        timeVisible: true,
        secondsVisible: false,
      };

      // === 가격 차트 ===
      const priceChart = createChart(priceRootRef.current, {
        height: priceH,
        width : priceRootRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        leftPriceScale : { visible: false, borderColor: "#e5e7eb" },
        rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.05, bottom: 0.05 } },
        timeScale: { visible: false, borderColor: "#e5e7eb" },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: true,  labelVisible: true },
        },
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

      // SMA
      for (const p of sma) {
        const key = `SMA${p}`;
        const line = priceChart.addLineSeries({
          lineWidth: 2, color: pickSMAColor(key),
          priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        lineRefs.current[key] = line;
      }

      // === 거래량 차트 ===
      const volChart = createChart(volRootRef.current, {
        height: volH,
        width : volRootRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#6b7280" },
        leftPriceScale : { visible: false },
        rightPriceScale: { visible: true, borderColor: "#e5e7eb" },
        timeScale: { visible: true, borderColor: "#e5e7eb", timeVisible: true, secondsVisible: false },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: false, labelVisible: false }, // 거래량 수평선 제거
        },
      });
      volChart.applyOptions({ timeScale: commonTs });

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceLineVisible: false, lastValueVisible: false,
      });
      volSeries.applyOptions({
        autoscaleInfoProvider: (orig: any) => {
          const r = orig(); if (!r) return r;
          r.priceRange.minValue = 0; return r;
        },
      });

      // === 공통 세로선 ===
      const vline = document.createElement("div");
      Object.assign(vline.style, {
        position: "absolute", top: "0", bottom: "0", width: "0",
        borderRight: "1px dashed rgba(0,0,0,0.22)", pointerEvents: "none", display: "none",
      } as CSSStyleDeclaration);
      rootRef.current.appendChild(vline);
      vlineRef.current = vline;

      // === Hover 라벨 (가격: OHLC, 거래량: 값) ===
      const priceHover = document.createElement("div");
      priceHover.className = "absolute z-40 text-xs rounded px-2 py-1";
      Object.assign(priceHover.style, {
        top: "8px", left: "8px", background: "rgba(255,255,255,0.9)",
        border: "1px solid #e5e7eb", display: "none", pointerEvents: "none", backdropFilter: "blur(2px)",
      } as CSSStyleDeclaration);
      priceRootRef.current.appendChild(priceHover);
      priceHoverRef.current = priceHover;

      const volHover = document.createElement("div");
      volHover.className = "absolute z-40 text-xs rounded px-2 py-1";
      Object.assign(volHover.style, {
        top: `${priceH + 8}px`, left: "8px", background: "rgba(255,255,255,0.9)",
        border: "1px solid #e5e7eb", display: "none", pointerEvents: "none", backdropFilter: "blur(2px)",
      } as CSSStyleDeclaration);
      rootRef.current.appendChild(volHover);
      volHoverRef.current = volHover;

      // ====== 끝선 맞춤 (보이는 오른쪽 경계로) ======
      const alignRightEdgeExact = () => {
        if (!priceRootRef.current || !volRootRef.current) return;
        
        // 두 차트 모두 같은 컨테이너 너비 사용
        const containerW = priceRootRef.current.clientWidth;
        
        // 가격 차트 기준으로 정렬
        const priceTS = priceChart.timeScale();
        const lr = priceTS.getVisibleLogicalRange();
        if (!lr) return;
        
        // 가격 차트의 오른쪽 끝 좌표 계산
        const xRight = priceTS.logicalToCoordinate(lr.to);
        if (xRight == null) return;
        
        // 거래량 차트도 같은 너비로 설정
        volChart.applyOptions({ width: containerW });
        
        // 거래량 차트의 timeScale도 동일한 논리 범위 설정
        const volTS = volChart.timeScale();
        volTS.setVisibleLogicalRange(lr);
        
        // 거래량 차트의 오른쪽 끝 좌표 확인 및 보정
        const volXRight = volTS.logicalToCoordinate(lr.to);
        if (volXRight != null && Math.abs(volXRight - xRight) > 1) {
          // 미세 조정이 필요한 경우
          const padding = Math.max(0, containerW - xRight);
          volRootRef.current.style.paddingRight = `${padding}px`;
          volChart.applyOptions({ width: containerW - padding });
        } else {
          // 패딩 리셋
          volRootRef.current.style.paddingRight = "0px";
        }
      };

      // ==== 양방향 스크롤/줌 동기화 + 정렬 ====
      let syncing = false;
      const syncFromPrice = () => {
        if (syncing) return;
        syncing = true;
        const lr = priceChart.timeScale().getVisibleLogicalRange();
        if (lr) {
          volChart.timeScale().setVisibleLogicalRange(lr);
          // 동기화 후 즉시 정렬
          setTimeout(alignRightEdgeExact, 0);
        }
        syncing = false;
      };
      const syncFromVolume = () => {
        if (syncing) return;
        syncing = true;
        const lr = volChart.timeScale().getVisibleLogicalRange();
        if (lr) {
          priceChart.timeScale().setVisibleLogicalRange(lr);
          // 동기화 후 즉시 정렬
          setTimeout(alignRightEdgeExact, 0);
        }
        syncing = false;
      };
      priceChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromPrice);
      volChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromVolume);

      // ==== 리사이즈 ====
      const placeVolLabel = () => {
        if (!volRootRef.current || !volLabelRef.current) return;
        volLabelRef.current.style.top = `${priceRootRef.current!.clientHeight + 6}px`;
        volLabelRef.current.style.left = "10px";
      };
      const ro = new ResizeObserver(() => {
        const w = rootRef.current?.clientWidth ?? 600;
        const priceH2 = Math.round((rootRef.current?.clientHeight ?? height) * (1 - ratio));
        const volH2   = Math.max(80, (rootRef.current?.clientHeight ?? height) - priceH2);
        
        // 두 차트 모두 같은 너비로 설정
        priceChart.applyOptions({ width: w, height: priceH2 });
        volChart.applyOptions({ width: w, height: volH2 });
        
        placeVolLabel();
        
        // 리사이즈 후 정렬 (약간의 지연을 두어 차트가 완전히 렌더링된 후 실행)
        setTimeout(alignRightEdgeExact, 10);
        
        if (volHoverRef.current) volHoverRef.current.style.top = `${priceH2 + 8}px`;
      });
      ro.observe(rootRef.current!);
      roRef.current = ro;

      // refs 바인딩
      priceChartRef.current = priceChart;
      volChartRef.current   = volChart;
      candleRef.current     = candle;
      volSeriesRef.current  = volSeries;

      // 기본 거래량 라벨(마지막 값)
      placeVolLabel();
      const lastT = candles.at(-1)?.time as number | undefined;
      if (volLabelRef.current) {
        const v = lastT != null ? volByTime.get(lastT) ?? null : null;
        volLabelRef.current.textContent = `거래량 ${v != null ? nf.format(v) : "-"}`;
      }

      // 루트 기준 마우스 이동 → 두 차트/라벨 동기화
      const handleMove = (ev: MouseEvent) => {
        if (!rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        if (x < 0 || x > rect.width) return hideHover();

        if (vlineRef.current) {
          vlineRef.current.style.display = "block";
          vlineRef.current.style.left = `${Math.round(x)}px`;
        }

        const t = priceChart.timeScale().coordinateToTime(x);
        if (t == null) return;

        const c = nearestCandle(candles, t);
        const v = nearestVolume(volumes, t);

        if (c && candleRef.current) priceChart.setCrosshairPosition(c.close, c.time, candleRef.current);
        if (v && volSeriesRef.current) volChart.setCrosshairPosition(v.value, v.time, volSeriesRef.current);

        if (c && priceHoverRef.current) {
          priceHoverRef.current.style.display = "block";
          priceHoverRef.current.innerHTML = `
            <b>시</b> ${nf.format(c.open)} &nbsp;
            <b>고</b> ${nf.format(c.high)} &nbsp;
            <b>저</b> ${nf.format(c.low)} &nbsp;
            <b>종</b> ${nf.format(c.close)}
          `;
        }
        if (v && volHoverRef.current) {
          volHoverRef.current.style.display = "block";
          volHoverRef.current.textContent = `거래량 ${nf.format(v.value)}`;
        }
      };

      const hideHover = () => {
        if (vlineRef.current) vlineRef.current.style.display = "none";
        priceChart.clearCrosshairPosition?.();
        volChart.clearCrosshairPosition?.();
        if (priceHoverRef.current) priceHoverRef.current.style.display = "none";
        if (volHoverRef.current)   volHoverRef.current.style.display   = "none";
      };

      rootRef.current.addEventListener("mousemove", handleMove);
      rootRef.current.addEventListener("mouseleave", hideHover);

      // 초기 1회 끝선 맞춤 (차트 초기화 완료 후)
      setTimeout(alignRightEdgeExact, 50);

      return () => {
        rootRef.current?.removeEventListener("mousemove", handleMove);
        rootRef.current?.removeEventListener("mouseleave", hideHover);
      };
    };

    const cleanup = init();

    return () => {
      roRef.current?.disconnect();
      if (vlineRef.current?.parentElement) vlineRef.current.parentElement.removeChild(vlineRef.current);
      if (priceHoverRef.current?.parentElement) priceHoverRef.current.parentElement.removeChild(priceHoverRef.current);
      if (volHoverRef.current?.parentElement)   volHoverRef.current.parentElement.removeChild(volHoverRef.current);
      priceChartRef.current?.remove?.();
      volChartRef.current?.remove?.();
      priceChartRef.current = null;
      volChartRef.current   = null;
      candleRef.current     = null;
      volSeriesRef.current  = null;
      lineRefs.current      = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, showVolume, sma, volumes, volByTime, candles, volumeAreaRatio]);

  // ===== 데이터 바인딩 =====
  useEffect(() => {
    if (!candleRef.current || !priceChartRef.current || !volChartRef.current) return;

    // 가격/SMA
    candleRef.current.setData(candles);
    for (const k of Object.keys(lineRefs.current)) lineRefs.current[k].setData(smaVisible[k] ?? []);

    // 거래량
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

    // 최근 300봉으로 초기 범위 설정(양쪽 동일)
    const n = candles.length;
    if (n > 0) {
      const fromIdx = Math.max(0, n - 300);
      const from = candles[fromIdx].time as number;
      const to   = candles[n - 1].time as number;

      // 동일 범위 적용
      const priceTS = priceChartRef.current.timeScale();
      const volTS   = volChartRef.current.timeScale();
      priceTS.setVisibleLogicalRange({ from, to });
  volTS.setVisibleLogicalRange({ from, to });

      // ★ 추가: 논리범위를 한 번 더 복제해 초기 상태 고정
      const lr = priceTS.getVisibleLogicalRange();
      if (lr) volTS.setVisibleLogicalRange(lr);

      // 범위 적용 후 오른쪽 끝 정렬(보정)
      setTimeout(() => {
        if (!priceChartRef.current || !volChartRef.current) return;
        alignRightEdgeExact();
      }, 100);
    }
  }, [candles, volumes, smaVisible, trades]);

  // ===== 델타/레전드(고정) =====
  const deltas = useMemo(() => {
    if (data.length < 2) return { o: 0, h: 0, l: 0, c: 0 };
    const last = data[data.length - 1], prev = data[data.length - 2];
    const base = prev.close || 1;
    const pct = (v: number) => ((v - base) / base) * 100;
    return { o: pct(last.open), h: pct(last.high), l: pct(last.low), c: pct(last.close) };
  }, [data]);

  return (
    <div ref={rootRef} className="relative w-full" style={{ height }}>
      {/* 상단 레전드(고정) */}
      {showLegend && (
        <div
          className="absolute left-2 top-2 z-50 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs rounded-md px-2 py-1 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb", backdropFilter: "blur(2px)" }}
        >
          <span>시 <Delta v={deltas.o} /></span>
          <span>고 <Delta v={deltas.h} /></span>
          <span>저 <Delta v={deltas.l} /></span>
          <span>종 <Delta v={deltas.c} /></span>
          <span className="text-gray-300">|</span>
          <span className="font-bold text-black">이동평균</span>
          {sma.map(p => (<span key={p} className="font-bold" style={{ color: pickSMAColor(`SMA${p}`) }}>{p}</span>))}
        </div>
      )}

      {/* 두 개의 영역 */}
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

      {/* 기본 거래량 라벨(최근 값) */}
      {showVolume && (
        <div ref={volLabelRef} className="absolute z-30 text-xs text-gray-700" style={{ pointerEvents: "none" }} />
      )}

      {/* 구분선 */}
      <div
        className="absolute left-0 right-0"
        style={{ top: Math.round(height * (1 - (volumeAreaRatio ?? 0.22))), height: 1, background: "#d1d5db", pointerEvents: "none" }}
      />
    </div>
  );
}

/* ===== 유틸 ===== */
function nearestCandle(list: {time:number|any, open:number;high:number;low:number;close:number}[], t:any) {
  const ti = typeof t === "number" ? t : (t?.timestamp ?? undefined);
  if (ti == null) return list.find(c => (c.time as number) === t) ?? list[list.length-1];
  let best = list[0], bd = Math.abs((list[0].time as number) - ti);
  for (const c of list) {
    const d = Math.abs((c.time as number) - ti);
    if (d < bd) { best = c; bd = d; }
  }
  return best;
}
function nearestVolume(list: {time:number|any, value:number}[], t:any) {
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
