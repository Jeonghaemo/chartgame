// components/HeaderHearts.tsx
"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/lib/store/user";
import { Heart } from "lucide-react";

export default function HeaderHearts() {
  const hearts = useUserStore((s) => s.hearts);
  const maxHearts = useUserStore((s) => s.maxHearts);
  const setFromMe = useUserStore((s) => s.setFromMe);

  // 숫자 변화 애니메이션용 ref
  const prev = useRef<number | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setFromMe(); // 첫 마운트 동기화
  }, [setFromMe]);

  useEffect(() => {
    if (prev.current == null) {
      prev.current = hearts ?? null;
      return;
    }
    if (hearts != null && prev.current !== hearts) {
      // 살짝 튀는 애니메이션
      spanRef.current?.classList.add("scale-110");
      setTimeout(() => spanRef.current?.classList.remove("scale-110"), 180);
      prev.current = hearts;
    }
  }, [hearts]);

  if (hearts == null || maxHearts == null) {
    return <span className="text-sm text-gray-500">하트 불러오는 중…</span>;
  }

  const isFull = hearts >= maxHearts;

  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <Heart className={`w-4 h-4 ${isFull ? "fill-red-500 text-red-500" : "text-red-500"}`} />
      <span>생명력</span>
      <span ref={spanRef} className="transition-transform">{hearts} / {maxHearts}</span>
    </span>
  );
}



