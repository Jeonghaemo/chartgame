"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type AdSize = "small" | "large";
const LARGE_WIDTH = 340; // 340px 이상이면 320x100, 아니면 300x50

export default function MobileAd() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<AdSize>("small");
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  // 경로가 바뀔 때마다 새로운 키처럼 동작(클라 라우팅 시 "이미 채워진 ins" 재사용 방지)
  const routeKey = useMemo(() => pathname + "|" + Date.now(), [pathname]);

  // 1) 컨테이너 폭 기반 사이즈 결정
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const decide = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      setSize(w >= LARGE_WIDTH ? "large" : "small");
    };

    decide();
    const ro = new ResizeObserver(decide);
    ro.observe(el);
    return () => ro.disconnect();
  }, [routeKey]);

  // 2) 화면에 보일 때만 로드(조금의 지연으로 레이아웃 안정화 + 조기 push 방지)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "100px 0px" } // 살짝 미리 로드
    );

    io.observe(el);
    return () => io.disconnect();
  }, [routeKey]);

  // 3) AdSense push (이미 채워진 ins 처리 포함)
  useEffect(() => {
    if (!ready) return;
    const doPush = () => {
      try {
        // 글로벌 큐 준비
        // @ts-ignore
        window.adsbygoogle = window.adsbygoogle || [];

        // 이미 채워진 슬롯이면 초기화(클라 라우팅/리렌더 케이스)
        const ins = insRef.current as any;
        if (ins && ins.getAttribute && ins.getAttribute("data-adsbygoogle-status") === "done") {
          // 내부를 비우고 다시 생성
          ins.innerHTML = "";
          ins.removeAttribute("data-adsbygoogle-status");
        }

        // @ts-ignore
        (window.adsbygoogle as any).push({});
      } catch (e) {
        // 디버깅 도움용(콘솔에서 에러 원인을 확인 가능)
        console.warn("[MobileAd] push failed:", e);
      }
    };

    // 스크립트가 늦게 로드되는 환경 대비, 작은 지연 후 push
    const t = setTimeout(doPush, 60);
    return () => clearTimeout(t);
  }, [ready, size, routeKey]);

  const style =
    size === "large"
      ? { display: "inline-block", width: 320, height: 100 }
      : { display: "inline-block", width: 300, height: 50 };

  return (
    <div ref={wrapRef} className="mx-auto my-3" style={{ width: "100%", maxWidth: 360, minHeight: 50 }}>
      <ins
        ref={insRef as any}
        key={routeKey + "|" + size}
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-4564123418761220"  /* ← 본인 값 */
        data-ad-slot="2809714485"                 /* ← 본인 값(PC 용과 '다른' 슬롯 권장) */
        data-full-width-responsive="false"
        // 개발 중 로컬/프리뷰에서만 테스트 광고 강제하고 싶다면 ↓을 잠깐 켜세요(배포본에서는 제거!)
        // data-adtest="on"
      />
    </div>
  );
}
