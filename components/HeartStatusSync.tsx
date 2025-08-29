// components/HeartStatusSync.tsx
"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store/user";

export default function HeartStatusSync() {
  const setFromMe = useUserStore((s) => s.setFromMe);

  useEffect(() => {
    let timer: number | undefined;

    const sync = async () => {
      try { await setFromMe(); } catch {}
    };

    // 초기 1회 + 탭 활성화 시 + 주기적 동기화
    sync();
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);

    timer = window.setInterval(sync, 30_000); // 30초마다 동기화

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (timer) clearInterval(timer);
    };
  }, [setFromMe]);

  return null; // UI 렌더링 안 함
}
