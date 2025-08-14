"use client"

import { useEffect, useMemo, useRef, useState } from "react"

declare global { interface Window { LightweightCharts?: any } }

type OHLC = { time: number | string; open: number; high: number; low: number; close: number; volume?: number }
type Trade = { time: number | string; side: "BUY" | "SELL" }
type Props = {
  data: OHLC[]
  fullForMA?: OHLC[]
  height?: number
  sma?: number[]
  showLegend?: boolean
  showVolume?: boolean
  trades?: Trade[]
}

function toDayTs(t: number | string): number {
  const d = typeof t === "number" ? new Date(t > 1e12 ? t : t * 1000) : new Date(t)
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000)
}

function calcSMA(closes: number[], period: number) {
  const out: (number | null)[] = Array(closes.length).fill(null)
  let sum = 0
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i]
    if (i >= period) sum -= closes[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

function splitHeights(total: number) {
  const volPct = 0.26, gap = 10
  const vol = Math.max(100, Math.round(total * volPct))
  const main = Math.max(200, total - vol - gap)
  return { main, vol }
}

export default function CandleChart({
  data,
  fullForMA,
  height = 640,
  sma = [20, 60, 120, 240],
  showLegend = true,
  showVolume = true,
  trades = []
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const volRef = useRef<HTMLDivElement | null>(null)

  const chartTopRef = useRef<any>(null)
  const chartVolRef = useRef<any>(null)
  const candleRef = useRef<any>(null)
  const volSeriesRef = useRef<any>(null)
  const lineRefs = useRef<Record<string, any>>({})

  const roRef = useRef<ResizeObserver | null>(null)
  const mountedRef = useRef(false)

  const [dims, setDims] = useState(() => splitHeights(height))

  const baseAll = useMemo(() => (fullForMA?.length ? fullForMA : data), [fullForMA, data])
  const baseTs = useMemo(() => baseAll.map(d => toDayTs(d.time)), [baseAll])
  const baseCloses = useMemo(() => baseAll.map(d => d.close), [baseAll])

  const candles = useMemo(() => {
    const arr = data.map(d => ({
      time: toDayTs(d.time),
      open: d.open, high: d.high, low: d.low, close: d.close
    }))
    arr.sort((a,b) => (a.time as number) - (b.time as number))
    return arr
  }, [data])

  const volumes = useMemo(() => {
    const arr = data.map((d, i) => ({
      time: toDayTs(d.time),
      value: d.volume ?? 0,
      color: i === 0 || d.close >= (data[i - 1]?.close ?? d.close) ? "#ef4444CC" : "#3b82f6CC",
    }))
    arr.sort((a,b) => (a.time as number) - (b.time as number))
    return arr
  }, [data])

  const smaFull = useMemo(() => {
    const out: Record<string, { time: number; value: number }[]> = {}
    for (const p of sma) {
      const arr = calcSMA(baseCloses, p)
      const series: { time: number; value: number }[] = []
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i]
        if (v == null) continue
        series.push({ time: baseTs[i], value: Number(v) })
      }
      out[`SMA${p}`] = series
    }
    return out
  }, [baseCloses, baseTs, sma])

  const smaVisible = useMemo(() => {
    const lastTs = candles.length ? (candles[candles.length - 1].time as number) : null
    const out: Record<string, { time: number; value: number }[]> = {}
    for (const k of Object.keys(smaFull)) {
      out[k] = lastTs == null ? [] : (smaFull[k] ?? []).filter(pt => pt.time <= lastTs)
    }
    return out
  }, [candles, smaFull])

  useEffect(() => setDims(splitHeights(height)), [height])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const load = async () => {
      if (!window.LightweightCharts) {
        await new Promise<void>((resolve, reject) => {
          const id = "lwc-umd"
          if (document.getElementById(id)) {
            const el = document.getElementById(id) as HTMLScriptElement
            el.addEventListener("load", () => resolve())
            el.addEventListener("error", e => reject(e))
          } else {
            const s = document.createElement("script")
            s.id = id
            s.src = "https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"
            s.async = true
            s.onload = () => resolve()
            s.onerror = (e) => reject(e)
            document.body.appendChild(s)
          }
        })
      }
      if (!topRef.current || !volRef.current) return

      const { createChart, ColorType } = window.LightweightCharts
      const up = "#ef4444", down = "#3b82f6"

      const chartTop = createChart(topRef.current, {
        height: dims.main,
        width: topRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        leftPriceScale: { visible: false }, // ✅ 왼쪽 가격축 숨기기
        rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.05, bottom: 0.05 } },
        timeScale: { borderColor: "#e5e7eb", visible: true },
        grid: { vertLines: { color: "#eff2f6" }, horzLines: { color: "#eff2f6" } },
        crosshair: { mode: 1 },
      })
      const candle = chartTop.addCandlestickSeries({
        upColor: up, downColor: down,
        borderUpColor: up, borderDownColor: down,
        wickUpColor: up, wickDownColor: down,
        priceLineVisible: true,
        lastValueVisible: true,
        priceFormat: { type: "price", precision: 0, minMove: 1 } // ✅ 가격 정수 표시
      })

      const chartVol = createChart(volRef.current, {
        height: dims.vol,
        width: volRef.current.clientWidth,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#374151" },
        rightPriceScale: { borderColor: "#e5e7eb" },
        timeScale: { borderColor: "#e5e7eb", visible: false },
        grid: { vertLines: { color: "#eff2f6" }, horzLines: { color: "#eff2f6" } },
        crosshair: { mode: 1 },
      })
      const volSeries = chartVol.addHistogramSeries({
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      })

      chartTopRef.current = chartTop
      chartVolRef.current = chartVol
      candleRef.current = candle
      volSeriesRef.current = volSeries

      sma.forEach(p => {
        const key = `SMA${p}`
        const line = chartTop.addLineSeries({
          lineWidth: 2, color: pickSMAColor(key),
          priceLineVisible: false, lastValueVisible: false,
        })
        lineRefs.current[key] = line
      })

      const ro = new ResizeObserver(() => {
        const w = rootRef.current?.clientWidth ?? 600
        chartTop.applyOptions({ width: w })
        chartVol.applyOptions({ width: w })
        const r = chartTop.timeScale().getVisibleRange()
        if (r) chartVol.timeScale().setVisibleRange(r)
      })
      ro.observe(rootRef.current!)
      roRef.current = ro

      chartTop.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
        if (!range || range.from == null || range.to == null) return
        try {
          chartVol.timeScale().setVisibleRange({ from: range.from, to: range.to })
        } catch {}
      })

      candle.setData(candles)

      if (Array.isArray(trades) && trades.length > 0) {
  const markers = trades.map(t => {
    // 1. 날짜 변환
    const tradeTime = toDayTs(t.time)

    // 2. candles 배열에서 동일한 time 찾기
    const candleMatch = candles.find(c => c.time === tradeTime)

    // 3. 없으면 가장 가까운 캔들의 time 사용
    const matchedTime = candleMatch
      ? candleMatch.time
      : candles.reduce((prev, curr) => {
          return Math.abs((curr.time as number) - tradeTime) <
                 Math.abs((prev.time as number) - tradeTime)
            ? curr
            : prev
        }).time

    // 4. 마커 객체 리턴
    return {
      time: matchedTime,
      position: t.side === "BUY" ? "belowBar" : "aboveBar",
      color: t.side === "BUY" ? "#e63946" : "#457b9d",
      shape: t.side === "BUY" ? "arrowUp" : "arrowDown",
      text: t.side === "BUY" ? "매수" : "매도"
    }
  })

  candle.setMarkers(markers)
}


      volSeries.setData(volumes)
      for (const key of Object.keys(lineRefs.current)) {
        lineRefs.current[key].setData(smaVisible[key] ?? [])
      }

      chartTop.timeScale().scrollToRealTime()
    }

    load()

    return () => {
      roRef.current?.disconnect()
      chartTopRef.current?.remove?.()
      chartVolRef.current?.remove?.()
      lineRefs.current = {}
      mountedRef.current = false
    }
  }, [candles, volumes, smaVisible, trades, dims.main, dims.vol, sma])

  const deltas = useMemo(() => {
    if (data.length < 2) return { o: 0, h: 0, l: 0, c: 0 }
    const last = data[data.length - 1], prev = data[data.length - 2]
    const base = prev.close || 1
    const pct = (v: number) => ((v - base) / base) * 100
    return { o: pct(last.open), h: pct(last.high), l: pct(last.low), c: pct(last.close) }
  }, [data])

  return (
    <div ref={rootRef} className="relative w-full" style={{ height }}>
      {showLegend && (
        <div
          className="absolute left-2 top-2 z-50 flex items-center gap-3 text-xs rounded-md px-2 py-1 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb", backdropFilter: "blur(2px)" }}
        >
          <span>시 <Delta v={deltas.o} /></span>
          <span>고 <Delta v={deltas.h} /></span>
          <span>저 <Delta v={deltas.l} /></span>
          <span>종 <Delta v={deltas.c} /></span>
          <span className="text-gray-300">|</span>
          {sma.map(p => <span key={p} className="font-bold">{`SMA ${p}`}</span>)}
        </div>
      )}

      <div ref={topRef} style={{ height: dims.main }} />
      <div className="border-t border-slate-200 my-1" />
      {showVolume && <div ref={volRef} style={{ height: dims.vol }} />}
    </div>
  )
}

function pickSMAColor(key: string) {
  if (/SMA20/.test(key)) return "#8e24aa"
  if (/SMA60/.test(key)) return "#ff9800"
  if (/SMA120/.test(key)) return "#1976d2"
  if (/SMA240/.test(key)) return "#2e7d32"
  if (/SMA50/.test(key)) return "#6b7280"
  return "#455a64"
}

function Delta({ v }: { v: number }) {
  const cls = v > 0 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-gray-500"
  const sign = v > 0 ? "+" : ""
  return <b className={cls}>{`${sign}${v.toFixed(2)}%`}</b>
}
