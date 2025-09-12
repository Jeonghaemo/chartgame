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

  const slotRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef<boolean>(true);

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
    setViewableMs(0);
    setInteracted(false);
    setSlotVisibleMaxPct(0);
    setConfirmEnabled(false);
  };

  const handleClose = () => setOpen(false);

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
      await load();      // remaining 갱신
      await setFromMe(); // 하트 수 갱신
      setOpen(false);
    }
  };

  const DAILY_LIMIT = 10;
  const label = info?.eligible
    ? `하트 무료 충전 (${info.remaining}회 남음)`
    : `오늘 충전 기회 소진(내일 ${DAILY_LIMIT}회)`;

  // 노출 체크
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
    ["scroll", "keydown", "mousemove", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, markInteract, { once: true, passive: true })
    );

    let io: IntersectionObserver | null = null;
    if (slotRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          const ratio = e?.intersectionRatio ?? 0;
          visibleRef.current = !!(e?.isIntersecting && ratio >= 0.5);
          setSlotVisibleMaxPct((p) => Math.max(p, ratio));
        },
        { threshold: [0.0, 0.25, 0.5, 0.75, 1.0] }
      );
      io.observe(slotRef.current);
    }

    const id = setInterval(() => {
      if (visibleRef.current && activeRef.current) {
        setViewableMs((ms) => ms + 200);
      }
    }, 200);

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
      ["scroll", "keydown", "mousemove", "touchstart"].forEach((ev) =>
        window.removeEventListener(ev, markInteract)
      );
      if (io && slotRef.current) io.unobserve(slotRef.current);
      clearInterval(id);
    };
  }, [open]);

  useEffect(() => {
    setConfirmEnabled(viewableMs >= MIN_VIEWABLE_MS && interacted);
  }, [viewableMs, interacted]);

  const progress = Math.min(100, Math.round((viewableMs / MIN_VIEWABLE_MS) * 100));

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
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center">
          <div className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-bold">무료 충전</div>
            <div className="mt-2 text-sm text-gray-600">
              이 화면에는 제휴/광고 콘텐츠가 포함될 수 있습니다. 클릭은 자유입니다.
            </div>

{/* 광고 슬롯 */}
<div
  ref={slotRef}
  id="ad-slot"
  className="mt-4 rounded-xl border p-3 flex items-center justify-center"
  style={{ minHeight: 160 }}
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
    // ✅ 네이버 및 나머지 8개: 카드 스타일 링크
    <a
      href="https://naver.me/xLsEEb1q"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setInteracted(true)}
      className="w-full max-w-[320px] rounded-2xl border shadow hover:shadow-md transition bg-white overflow-hidden text-left"
    >
      <div className="flex items-center gap-3 p-3">
        <img
          src="https://www.google.com/s2/favicons?domain=naver.me&sz=64"
          alt="naver.me"
          width={40}
          height={40}
          className="rounded"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="font-semibold truncate">네이버 제휴 링크 열기</div>
          <div className="text-xs text-gray-500 truncate">https://naver.me/xLsEEb1q</div>
        </div>
      </div>
    </a>
  )}
</div>





            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
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
