// components/AdRecharge.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/user";

type NextInfo = {
  ok: boolean;
  eligible: boolean;
  reason?: "DAILY_LIMIT" | "COOLDOWN";
  remaining?: number;
  cooldownSeconds?: number;
  nextIndex?: number;
  provider?: "COUPANG" | "NAVER";
};

function formatHMS(sec: number) {
  if (!sec || sec < 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

const MIN_VIEWABLE_MS = 10_000; // 10초 (필요하면 8~12초로 A/B)

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [cool, setCool] = useState<number>(0);
  const [open, setOpen] = useState(false);

  // 노출 판정용 상태
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
    if (!j.eligible && j.cooldownSeconds) setCool(j.cooldownSeconds);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!cool || cool <= 0) return;
    const id = setInterval(() => setCool((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cool]);

  // 모달 열기
  const handleOpen = async () => {
    setOpen(true);

    // 세션 생성 (서버에서 userId, provider, 쿨타임/일한도 검증 & sessionId 발급)
    try {
      const r = await fetch("/api/ads/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: info?.provider ?? null }),
      });
      const j = await r.json();
      if (r.ok && j?.sessionId) setSessionId(j.sessionId);
    } catch (_) {}

    // 초기화
    setViewableMs(0);
    setInteracted(false);
    setSlotVisibleMaxPct(0);
    setConfirmEnabled(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // 광고 보러가기(완전 자율) — 클릭과 보상은 무관
  const handleGoAd = () => {
    if (!info?.eligible || !info.provider) return;
    const url = `/api/ads/redirect?provider=${info.provider.toLowerCase()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // [충전 확인] — 보상은 '노출/체류' 충족 시에만
  const handleConfirm = async () => {
    if (!confirmEnabled) return;

    try {
      const r = await fetch("/api/ads/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          viewableMs,
          interacted,
          slotVisibleMaxPct,
        }),
      });

      // 성공 시 하트 +1 지급(서버), 쿨타임/일4회 갱신 → 클라 동기화
      if (r.ok) {
        await load();       // 다음 순서/쿨타임/남은횟수 갱신
        await setFromMe();  // 헤더/스토어 하트 수 동기화
        setOpen(false);
      }
    } catch (_) {
      // 실패해도 닫지는 말자 (유저가 재시도할 수 있게)
    }
  };

  const label =
    info?.eligible
      ? `하트 무료 충전 (${info.remaining}회 남음)`
      : info?.reason === "DAILY_LIMIT"
      ? "오늘 충전 기회 소진(내일 4회)"
      : `쿨타임 진행 중: ${formatHMS(cool)}`;

  // --- 노출/체류 판정 로직 ----------------------------------------------------
  useEffect(() => {
    if (!open) return;

    // 탭 활성/비활성
    const onVis = () => {
      activeRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    // 사용자 미세 상호작용 (최소 1회)
    const markInteract = () => setInteracted(true);
    ["scroll", "keydown", "mousemove", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, markInteract, { once: true, passive: true })
    );

    // 광고 슬롯 가시성
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

    // 200ms 간격 누적 타이머
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

  // 확인 버튼 활성화 조건
  useEffect(() => {
    // 조건: ① 가시/체류 누적 ② 최소 10초 ③ 상호작용 1회
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

            {/* 광고 슬롯: 여기에 와이더플래닛/애드센스/애드핏 스니펫 삽입 */}
            <div
              ref={slotRef}
              id="ad-slot"
              className="mt-4 h-40 rounded-xl border grid place-items-center"
            >
              <div className="text-gray-500">
                {info?.provider === "COUPANG" ? "제휴 콘텐츠 영역" : "광고/제휴 콘텐츠 영역"}
              </div>
            </div>

            {/* 진행도/남은 시간 안내 (클릭과 무관) */}
            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                노출 시간 충족 시 [충전 확인] 버튼이 활성화됩니다. (최소 {Math.ceil(MIN_VIEWABLE_MS / 1000)}초)
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
                  title={confirmEnabled ? "하트 충전" : "노출 시간이 더 필요합니다"}
                >
                  충전 확인
                </button>
              </div>
            </div>

            {!info?.eligible && info?.reason === "COOLDOWN" && (
              <div className="mt-3 text-xs text-gray-500">쿨타임: {formatHMS(cool)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
