"use client";
import { create } from "zustand";

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
  history: { side: "BUY" | "SELL"; price: number; qty: number; time: string }[];
};

type InitInput = {
  symbol: string;
  prices: number[];
  startIndex: number;
  maxTurns: number;
  feeBps: number;
  slippageBps: number;
};

const INITIAL_CASH = 10_000_000;

export const useGame = create<State & {
  init: (x: InitInput) => void;
  next: () => void;
  buy: (qty: number) => void;
  sell: (qty: number) => void;
  end: () => void;
}>((set, get) => ({
  symbol: "",
  prices: [],
  startIndex: 0,
  cursor: 0,
  maxTurns: 50,
  turn: 0,
  feeBps: 5,
  slippageBps: 0,

  cash: INITIAL_CASH,
  shares: 0,
  avgPrice: null,

  status: "idle",
  history: [],

  init: ({ symbol, prices, startIndex, maxTurns, feeBps, slippageBps }) => {
    set({
      symbol,
      prices,
      startIndex,
      cursor: startIndex,
      maxTurns,
      turn: 0,
      feeBps,
      slippageBps,
      cash: INITIAL_CASH,
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
    set({ cursor: nextCursor, turn: newTurn, status: shouldEnd ? "ended" : "playing" });
  },

  buy: (qty: number) => {
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
    const newAvg = s.avgPrice == null ? fill : (s.avgPrice * s.shares + fill * qty) / newQty;
    set({
      cash: Math.floor(newCash),
      shares: newQty,
      avgPrice: newAvg,
      history: [{ side: "BUY", price: fill, qty, time: new Date().toISOString() }, ...s.history].slice(0, 200),
    });
  },

  sell: (qty: number) => {
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
    set({
      cash: Math.floor(newCash),
      shares: newQty,
      avgPrice: newAvg,
      history: [{ side: "SELL", price: fill, qty, time: new Date().toISOString() }, ...s.history].slice(0, 200),
    });
  },

  end: () => set({ status: "ended" }),
}));
