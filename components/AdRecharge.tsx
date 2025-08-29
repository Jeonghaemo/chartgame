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
  provider?: "COUPANG" | "NAVER";
};

const MIN_VIEWABLE_MS = 10_000; // 10초 노출 조건

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [open, setOpen] = useState(false);

  const [viewableMs, setViewableMs] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [slotVisibleMaxPct, setSlotVisibleMaxPct] = useState(0);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const slotRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef(!document.hidden);

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

  const handleOpen = async () => {
    setOpen(true);

    try {
      const r = await fetch("/api/ads/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: info?.provider ?? null }),
      });
      const j = await r.json();
      if (r.ok && j?.sessionId) setSessionId(j.sessionId);
    } catch (_) {}

    setViewableMs(0);
    setInteracted(false);
    setSlotVisibleMaxPct(0);
    setConfirmEnabled(false);
  };

  const handleClose = () => setOpen(false);

  const handleGoAd = () => {
    if (!info?.eligible || !info.provider) return;
    const url = `/api/ads/redirect?provider=${info.provider.toLowerCase()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleConfirm = async () => {
    if (!confirmEnabled) return;

    const r = await fetch("/api/ads/session/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, viewableMs, interacted, slotVisibleMaxPct }),
    });
    if (r.ok) {
      await load();
      await setFromMe();
      setOpen(false);
    }
  };

  const DAILY_LIMIT = 10;

const label = info?.eligible
  ? `하트 무료 충전 (${info.remaining}회 남음)`
  : `오늘 충전 기회 소진(내일 ${DAILY_LIMIT}회)`;

  // 광고 슬롯 노출 체크
  useEffect(() => {
    if (!open) return;

    const onVis = () => {
      activeRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

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
      document.removeEventListener("visibilitychange", onVis);
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
          <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-bold">무료 충전</div>
            <div className="mt-2 text-sm text-gray-600">
              이 화면에는 제휴/광고 콘텐츠가 포함될 수 있습니다. 클릭은 자유입니다.
            </div>

            <div
              ref={slotRef}
              id="ad-slot"
              className="mt-4 h-40 rounded-xl border grid place-items-center"
            >
              <div className="text-gray-500">
                {info?.provider === "COUPANG" ? "쿠팡 제휴 배너" : "네이버 제휴 배너"}
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                노출 {Math.ceil(MIN_VIEWABLE_MS / 1000)}초 충족 시 [충전 확인] 활성화
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button onClick={handleGoAd} className="rounded-xl border px-4 py-2">
                광고 자세히 보기
              </button>
              <div className="flex gap-2">
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
        </div>
      )}
    </div>
  );
}
