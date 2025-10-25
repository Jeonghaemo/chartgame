"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type AdSize = "small" | "large";
const LARGE_WIDTH = 340; // 340px 이상이면 320x100, 그 미만이면 300x50

export default function MobileAd() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<AdSize>("small");
  const [key, setKey] = useState(0); // 사이즈 변경 시 <ins> 재생성용

  // 컨테이너 폭 감지 후 광고 사이즈 결정
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const decide = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      const next: AdSize = w >= LARGE_WIDTH ? "large" : "small";
      setSize((prev) => {
        if (prev !== next) setKey((k) => k + 1);
        return next;
      });
    };

    decide(); // 초기 판정

    const ro = new ResizeObserver(() => decide());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 광고 로드 트리거
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [key, size]);

  const style =
    size === "large"
      ? { display: "inline-block", width: 320, height: 100 }
      : { display: "inline-block", width: 300, height: 50 };

  return (
    <div
      ref={wrapRef}
      className="mx-auto my-3"
      style={{ width: "100%", maxWidth: 360, minHeight: 50 }}
    >
      <ins
        key={key}
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-4564123418761220" 
        data-ad-slot="2809714485"                
        data-full-width-responsive="false"
      />
    </div>
  );
}
