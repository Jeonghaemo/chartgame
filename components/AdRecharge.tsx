// components/AdRecharge.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/user";

type NextInfo = {
  ok: boolean;
  eligible: boolean;
  reason?: "DAILY_LIMIT";
  remaining?: number;
  nextIndex?: number;
  provider?:
    | "COUPANG"
    | "NAVER"
    | "SKYSCANNER"
    | "AGODA"
    | "ALIEXPRESS"
    | "TRIPDOTCOM"
    | "AMAZON"
    | "KLOOK"
    | "OLIVEYOUNG";
};

const MIN_VIEWABLE_MS = 10_000; // 10초 노출 조건

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [open, setOpen] = useState(false);

  const [viewableMs, setViewableMs] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [slotVisibleMaxPct, setSlotVisibleMaxPct] = useState(0);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  // 진행바 스무딩용
  const [progressSmooth, setProgressSmooth] = useState(0);
  const rafRef = useRef<number>(0);

  const slotRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef<boolean>(true);
  const modalOpenRef = useRef<boolean>(false);

  const setFromMe = useUserStore((s) => s.setFromMe);

  const load = async () => {
    const r = await fetch("/api/ads/next", { cache: "no-store" });
    if (!r.ok) {
      setInfo(null);
      return;
    }
    const j: NextInfo = await r.json();
    setInfo(j);
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpen = () => {
    setOpen(true);
    modalOpenRef.current = true;
    setViewableMs(0);
    setInteracted(false);
    setSlotVisibleMaxPct(0);
    setConfirmEnabled(false);
    setProgressSmooth(0);
  };

  const handleClose = () => {
    modalOpenRef.current = false;
    setOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirmEnabled) return;

    const r = await fetch("/api/ads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: info?.provider ?? null,
        viewableMs,
        interacted,
        slotVisibleMaxPct,
      }),
    });
    if (r.ok) {
      await load(); // remaining 갱신
      await setFromMe(); // 하트 수 갱신
      setOpen(false);
      modalOpenRef.current = false;
    }
  };

  const DAILY_LIMIT = 10;
  const label = info?.eligible
    ? `하트 무료 충전 (${info.remaining}회 남음)`
    : `오늘 충전 기회 소진(내일 ${DAILY_LIMIT}회)`;

  // 노출 체크 (가시성 완화 + 보조 판정 + 모바일 제스처 전역 감지)
  useEffect(() => {
    if (!open) return;

    const onVis = () => {
      if (typeof document !== "undefined") activeRef.current = !document.hidden;
    };

    if (typeof document !== "undefined") {
      activeRef.current = !document.hidden;
      document.addEventListener("visibilitychange", onVis);
    }

    const markInteract = () => setInteracted(true);
    // 모바일에서 확실히 잡히도록 pointerdown 포함
    ["scroll", "keydown", "mousemove", "touchstart", "pointerdown"].forEach((ev) =>
      window.addEventListener(ev, markInteract, { once: true, passive: true })
    );

    // 보조 가시성 판정 (getBoundingClientRect 교차 비율)
    const isVisByRect = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const interW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const interH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const interArea = interW * interH;
      const elArea = Math.max(1, r.width * r.height);
      const ratio = interArea / elArea; // 0~1
      return ratio >= 0.25; // 완화(기존 0.5)
    };

    // iOS 주소창/툴바 변동으로 인한 순간적 false 완화
    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        // resize 직후 한두틱은 가시성 느슨하게
        visibleRef.current = true;
      }, 250);
    };
    window.addEventListener("resize", onResize, { passive: true });

    let io: IntersectionObserver | null = null;
    if (slotRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          const ratio = e?.intersectionRatio ?? 0;
          visibleRef.current = !!(e?.isIntersecting && ratio >= 0.25);
          setSlotVisibleMaxPct((p) => Math.max(p, ratio));
        },
        { threshold: [0.0, 0.1, 0.25, 0.5, 0.75, 1.0] }
      );
      io.observe(slotRef.current);
    }

    const id = setInterval(() => {
      // 교차출현 false여도 실제 교차율 25% 이상이면 인정
      const rectVis = isVisByRect(slotRef.current!);
      const visible = visibleRef.current || rectVis;

      if (visible && activeRef.current && modalOpenRef.current) {
        setViewableMs((ms) => ms + 200);
      }
    }, 200);

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
      ["scroll", "keydown", "mousemove", "touchstart", "pointerdown"].forEach((ev) =>
        window.removeEventListener(ev, markInteract)
      );
      window.removeEventListener("resize", onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (io && slotRef.current) io.unobserve(slotRef.current);
      clearInterval(id);
    };
  }, [open]);

    // 모든 제휴사: 노출 시간만으로 활성화
  useEffect(() => {
    setConfirmEnabled(viewableMs >= MIN_VIEWABLE_MS);
  }, [viewableMs]);

  // 진행바 스무딩 (requestAnimationFrame)
  useEffect(() => {
    const target = Math.min(100, (viewableMs / MIN_VIEWABLE_MS) * 100);
    cancelAnimationFrame(rafRef.current);

    const animate = () => {
      setProgressSmooth((curr) => {
        const diff = target - curr;
        // 부드러운 지수형 보간
        const step = Math.sign(diff) * Math.max(0.5, Math.abs(diff) * 0.15);
        const next = Math.abs(diff) < 0.5 ? target : curr + step;
        if (next !== target) rafRef.current = requestAnimationFrame(animate);
        return next;
      });
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [viewableMs]);

  const progress = Math.min(100, Math.round(progressSmooth));

  return (
    <div className="mt-0 rounded-2xl bg-white border p-6 text-center">
      <div className="font-semibold text-lg mb-4">❤️ 하트 무료 충전</div>

      <button
        disabled={!info?.eligible}
        onClick={handleOpen}
        className={`w-full rounded-xl px-4 py-3 text-base font-semibold transition
          ${info?.eligible ? "bg-rose-500 text-white hover:bg-rose-500" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
          onPointerDown={() => setInteracted(true)}
          onTouchStart={() => setInteracted(true)}
        >
          <div
            className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-xl"
            onPointerDown={() => setInteracted(true)}
            onTouchStart={() => setInteracted(true)}
          >
            <div className="text-lg font-bold">무료 충전</div>
            <div className="mt-2 text-sm text-gray-600">
              이 화면에는 제휴/광고 콘텐츠가 포함될 수 있습니다. 클릭은 자유입니다.
            </div>

            {/* 광고 슬롯 */}
            <div
              ref={slotRef}
              id="ad-slot"
              className="mt-4 flex items-center justify-center"
              style={{ minHeight: 180 }}
              onPointerDown={() => setInteracted(true)}
              onTouchStart={() => setInteracted(true)}
            >
              {info?.provider === "COUPANG" ? (
                // ✅ 쿠팡: 250x250 공식 배너 iframe
                <div className="rounded-2xl shadow w-[250px] h-[250px] overflow-hidden bg-white">
                  <iframe
                    title="Coupang Carousel"
                    src="https://ads-partners.coupang.com/widgets.html?id=903800&template=carousel&trackingCode=AF8851731&subId=&width=250&height=250&tsource="
                    width="250"
                    height="250"
                    frameBorder="0"
                    scrolling="no"
                    referrerPolicy="unsafe-url"
                    style={{ display: "block" }}
                  />
                </div>
              ) : (
                // ✅ 네이버 및 나머지 8개: 이미지 썸네일 카드 (컴팩트 텍스트)
                <a
                  href="https://naver.me/xLsEEb1q"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setInteracted(true)}
                  className="rounded-2xl shadow w-[250px] overflow-hidden bg-white text-left"
                >
                  {/* 이미지 영역 */}
                  <div className="w-full h-[160px] bg-gray-100">
                    <img
                      src="https://shop-phinf.pstatic.net/20230211_19/1676104105485qhh9e_JPEG/77239994177191191_610733684.jpg?type=m510"
                      alt="네이버 제휴 광고 이미지"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* 텍스트 영역 (컴팩트) */}
                  <div className="px-2 py-1">
                    <div className="text-sm font-semibold leading-snug truncate">
                      세로 수직 트리플 주식모니터 대형모니터암
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight truncate">
                      https://naver.me/xLsEEb1q
                    </div>
                  </div>
                </a>
              )}
            </div>

            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 transition-[width] duration-300 will-change-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                노출 {Math.ceil(MIN_VIEWABLE_MS / 1000)}초 충족 시 [충전 확인] 활성화
              </div>
            </div>

            {/* 버튼 */}
            <div className="mt-4 flex justify-end items-center gap-2">
              <button onClick={handleClose} className="rounded-xl border px-4 py-2">
                닫기
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-xl px-4 py-2 font-semibold ${
                  confirmEnabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
                disabled={!confirmEnabled}
              >
                충전 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
