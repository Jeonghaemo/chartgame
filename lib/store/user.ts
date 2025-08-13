// lib/store/user.ts
"use client";

import { create } from "zustand";

export type UserState = {
  id?: string;
  capital?: number;
  hearts?: number;
  maxHearts?: number;
  // 액션
  setFromMe: () => Promise<void>;
  setHearts: (hearts: number) => void;
  setCapital: (capital: number) => void; // ★ 추가
};

export const useUserStore = create<UserState>((set) => ({
  id: undefined,
  capital: undefined,
  hearts: undefined,
  maxHearts: undefined,

  setFromMe: async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (j?.ok && j?.user) {
        set({
          id: j.user.id,
          capital: j.user.capital,
          hearts: j.user.hearts,
          maxHearts: j.user.maxHearts,
        });
      }
    } catch {
      // noop
    }
  },

  setHearts: (hearts: number) => set({ hearts }),
  setCapital: (capital: number) => set({ capital }), // ★ 추가
}));
