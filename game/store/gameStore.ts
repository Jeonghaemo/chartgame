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
  feeBps: number;
  slippageBps: number;

  cash: number;
  shares: number;
  avgPrice: number | null;

  status: "idle" | "playing" | "ended";
  history: Trade[];
};

type InitInput = {
  symbol: string;
  prices: number[];
  startIndex: number;
  maxTurns: number;
  feeBps: number;
  slippageBps: number;
  startCash?: number; // ChartGame에서 넘기는 capital
};

type BuySellTime = number | string | undefined;

const INITIAL_CASH = 10_000_000;

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
    init: (x: InitInput) => void;
    next: () => void;
    buy: (qty: number, time?: BuySellTime) => void;
    sell: (qty: number, time?: BuySellTime) => void;
    end: () => void;

    // ✅ 복원용 액션
    setCursor: (cursor: number) => void;
    setCash: (cash: number) => void;
    setShares: (shares: number) => void;
    applySnapshot: (snap: { cursor: number; cash: number; shares: number }) => void;
  }
>((set, get) => ({
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
    });
  },

  end: () => set({ status: "ended" }),

  // ✅ 복원용 액션들
  setCursor: (cursor: number) => set({ cursor }),
  setCash: (cash: number) => set({ cash }),
  setShares: (shares: number) => set({ shares }),
  applySnapshot: (snap) => set({
    cursor: snap.cursor,
    cash: snap.cash,
    shares: snap.shares,
  }),
}));
