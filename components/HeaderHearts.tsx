// components/HeaderHearts.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/user";
import { Heart } from "lucide-react";

export default function HeaderHearts() {
  const hearts = useUserStore((s) => s.hearts);
  const maxHearts = useUserStore((s) => s.maxHearts);
  const lastRefillAt = useUserStore((s) => s.lastRefillAt);
  const setFromMe = useUserStore((s) => s.setFromMe);

  const [timeLeft, setTimeLeft] = useState<string>("");

  // 남은 시간 계산
  useEffect(() => {
    if (!lastRefillAt || hearts === undefined || maxHearts === undefined) return;
    if (hearts >= maxHearts) {
      setTimeLeft("");
      return;
    }
    const interval = setInterval(() => {
      const last = new Date(lastRefillAt);
      const next = new Date(last.getTime() + 60 * 60 * 1000);
      const diff = next.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("곧 충전");
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefillAt, hearts, maxHearts]);

  // 첫 마운트 시 /api/me 데이터 불러오기
  useEffect(() => {
    setFromMe();
  }, [setFromMe]);

  if (hearts == null || maxHearts == null) {
    return <span className="text-sm text-gray-500">하트 불러오는 중…</span>;
  }

  const isFull = hearts >= maxHearts;

  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      <Heart className={`w-4 h-4 ${isFull ? "fill-red-500 text-red-500" : "text-red-500"}`} />
      <span>{hearts} / {maxHearts}</span>
      {!isFull && (
        <span className="text-xs text-gray-500">({timeLeft} 후 +1)</span>
      )}
    </span>
  );
}
