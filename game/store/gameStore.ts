"use client";
import { create } from "zustand";

type Side = "BUY" | "SELL";
type Trade = { side: Side; price: number; qty: number; time: string };

type State = {
  symbol: string;
  prices: number[];
  startIndex: number;
  cursor: number;
  maxTurns: number;
  turn: number;
  feeBps: number;         // 거래 수수료 (bps)
  slippageBps: number;    // 슬리피지 (bps)

  cash: number;
  shares: number;
  avgPrice: number | null;

  status: "idle" | "playing" | "ended";
  history: Trade[];

  // ★ 누적 수수료 총합(원)
  feeAccrued: number;

  // ★ (선택) 세율(bps). 기본 0 = 세금 미적용
  taxRateBps: number;

  // ★ 차트변경 남은 횟수
  chartChangesLeft: number;
};

type InitInput = {
  symbol: string;
  prices: number[];
  startIndex: number;
  maxTurns: number;
  feeBps: number;
  slippageBps: number;
  startCash?: number;
};

type SnapshotInput = {
  cursor: number;
  cash: number;
  shares: number;
  turn?: number;
  avgPrice?: number | null;
  history?: Trade[];
  // 필요 시 확장 가능 (feeAccrued, chartChangesLeft 등)
};

type BuySellTime = number | string | undefined;

const INITIAL_CASH = 10_000_000;
const INITIAL_CHART_CHANGES = 3;

function toISO(t?: BuySellTime): string {
  if (t == null) return new Date().toISOString();
  if (typeof t === "number") {
    const ms = t > 1e12 ? t : t * 1000;
    return new Date(ms).toISOString();
  }
  return new Date(t).toISOString();
}

export const useGame = create<
  State & {
    // 기본 액션
    init: (x: InitInput) => void;
    next: () => void;
    buy: (qty: number, time?: BuySellTime) => void;
    sell: (qty: number, time?: BuySellTime) => void;
    end: () => void;

    // 복원용 액션
    setCursor: (cursor: number) => void;
    setCash: (cash: number) => void;
    setShares: (shares: number) => void;
    setTurn: (turn: number) => void;
    setAvgPrice: (avgPrice: number | null) => void;
    setHistory: (history: Trade[]) => void;
    applySnapshot: (snap: SnapshotInput) => void;

    // 차트변경 관련
    resetChartChanges: () => void; // 새 게임 시작 시 3으로 리셋
    decChartChanges: () => void;   // 차트변경 사용 시 1 감소

    // (선택) 세율 제어
    setTaxRateBps?: (bps: number) => void;
  }
>((set, get) => ({
  // ===== 초기값 =====
  symbol: "",
  prices: [],
  startIndex: 0,
  cursor: 0,
  maxTurns: 60,
  turn: 0,
  feeBps: 5,
  slippageBps: 0,

  cash: INITIAL_CASH,
  shares: 0,
  avgPrice: null,

  status: "idle",
  history: [],

  feeAccrued: 0,
  taxRateBps: 0,

  chartChangesLeft: INITIAL_CHART_CHANGES,

  // ===== 액션 =====
  init: ({ symbol, prices, startIndex, maxTurns, feeBps, slippageBps, startCash }) => {
    set({
      symbol,
      prices,
      startIndex,
      cursor: startIndex,
      maxTurns,
      turn: 0,
      feeBps,
      slippageBps,
      cash: Math.floor(startCash ?? INITIAL_CASH),
      shares: 0,
      avgPrice: null,
      status: "playing",
      history: [],
      feeAccrued: 0,                 // 새 게임 시작 시 수수료 누적 리셋
      // taxRateBps는 유지(정책에 따라 여기서 0으로 리셋해도 됨)
      // chartChangesLeft는 새 게임 트리거 측에서 3으로 재설정
    });
  },

  next: () => {
    const s = get();
    if (s.status !== "playing") return;
    const nextCursor = Math.min(s.prices.length - 1, s.cursor + 1);
    const newTurn = s.turn + 1;
    const shouldEnd = newTurn >= s.maxTurns || nextCursor >= s.prices.length - 1;
    set({
      cursor: nextCursor,
      turn: newTurn,
      status: shouldEnd ? "ended" : "playing",
    });
  },

  buy: (qty: number, time?: BuySellTime) => {
    const s = get();
    if (s.status !== "playing") return;
    const last = s.prices[s.cursor];
    if (!last) return;

    const fill = last * (1 + s.slippageBps / 10000);
    const cost = fill * qty;
    const fee = cost * (s.feeBps / 10000);

    if (s.cash < cost + fee) return;

    const newCash = s.cash - cost - fee;
    const newQty = s.shares + qty;
    const newAvg =
      s.avgPrice == null ? fill : (s.avgPrice * s.shares + fill * qty) / newQty;

    const trade: Trade = { side: "BUY", price: fill, qty, time: toISO(time) };

    set({
      cash: Math.floor(newCash),
      shares: newQty,
      avgPrice: newAvg,
      history: [trade, ...s.history].slice(0, 200),
      feeAccrued: Math.floor((s.feeAccrued ?? 0) + fee),
    });
  },

  sell: (qty: number, time?: BuySellTime) => {
    const s = get();
    if (s.status !== "playing") return;
    if (s.shares <= 0) return;

    qty = Math.min(qty, s.shares);

    const last = s.prices[s.cursor];
    if (!last) return;

    const fill = last * (1 - s.slippageBps / 10000);
    const proceeds = fill * qty;
    const fee = proceeds * (s.feeBps / 10000);

    const newCash = s.cash + proceeds - fee;
    const newQty = s.shares - qty;
    const newAvg = newQty === 0 ? null : s.avgPrice;

    const trade: Trade = { side: "SELL", price: fill, qty, time: toISO(time) };

    set({
      cash: Math.floor(newCash),
      shares: newQty,
      avgPrice: newAvg,
      history: [trade, ...s.history].slice(0, 200),
      feeAccrued: Math.floor((s.feeAccrued ?? 0) + fee),
    });
  },

  end: () => set({ status: "ended" }),

  // ===== 복원용 =====
  setCursor: (cursor: number) => set({ cursor }),
  setCash: (cash: number) => set({ cash }),
  setShares: (shares: number) => set({ shares }),
  setTurn: (turn: number) => set({ turn }),
  setAvgPrice: (avgPrice: number | null) => set({ avgPrice }),
  setHistory: (history: Trade[]) => set({ history }),
  applySnapshot: (snap: SnapshotInput) =>
    set({
      cursor: snap.cursor,
      cash: snap.cash,
      shares: snap.shares,
      turn: snap.turn ?? 0,
      avgPrice: snap.avgPrice ?? null,
      history: snap.history ?? [],
    }),

  // ===== 차트변경 제어 =====
  resetChartChanges: () => set({ chartChangesLeft: INITIAL_CHART_CHANGES }),
  decChartChanges: () => {
    const left = Math.max(0, (get().chartChangesLeft ?? 0) - 1);
    set({ chartChangesLeft: left });
  },

  // (선택) 세율 변경
  setTaxRateBps: (bps: number) => set({ taxRateBps: Math.max(0, Math.floor(bps)) }),
}));
