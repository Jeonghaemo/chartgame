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

  // provider를 서버에 전달해야 adWatch 기록 가능 → remaining 감소 반영
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
    await load();      // /api/ads/next 다시 불러서 remaining 갱신
    await setFromMe(); // 하트 수 동기화
    setOpen(false);    // 모달 닫기(컨테이너 클린업 동작)
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
      if (typeof document !== "undefined") {
        activeRef.current = !document.hidden;
      }
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

  // ✅ 쿠팡 위젯 스크립트 삽입 (컨테이너 내부 고정 + 노이즈 노드 정리 + 잔상 제거)
useEffect(() => {
  const isCoupang = open && info?.provider === "COUPANG";
  const mount = document.getElementById("coupang-mount"); // 실제 렌더 위치(250x250)

  if (isCoupang && mount) {
    // 깨끗한 상태로 시작
    mount.innerHTML = "";

    // g.js
    const s1 = document.createElement("script");
    s1.src = "https://ads-partners.coupang.com/g.js";
    s1.async = true;

    // 위젯 생성 스크립트
    const s2 = document.createElement("script");
    s2.innerHTML = `
      try {
        new PartnersCoupang.G({
          id: 903800,
          template: "carousel",
          trackingCode: "AF8851731",
          width: "250",
          height: "250",
          tsource: ""
        });
      } catch (e) { /* noop */ }
    `;

    // 컨테이너 내부에만 삽입
    mount.appendChild(s1);
    mount.appendChild(s2);

    // 위젯이 간혹 텍스트 노드/불필요 엘리먼트를 앞뒤에 생성하는 경우가 있어 정리
    const tidy = () => {
      // mount 안에서 iframe 외 노드는 제거
      const iframes = Array.from(mount.querySelectorAll("iframe"));
      // iframe이 생성되었다면 나머지 자식은 모두 제거
      if (iframes.length > 0) {
        Array.from(mount.childNodes).forEach((node) => {
          if (node.nodeName !== "IFRAME" && node.nodeName !== "SCRIPT") {
            mount.removeChild(node);
          }
        });
      }
    };

    // 위젯 로딩 비동기 → 약간의 지연 후 정리 시도
    const t1 = setTimeout(tidy, 300);
    const t2 = setTimeout(tidy, 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      // 모달 닫히면 컨테이너 비우기(잔상/중복 방지)
      mount.innerHTML = "";
    };
  }

  // 기본 정리
  return () => {
    if (mount) mount.innerHTML = "";
  };
}, [open, info]);



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
              style={{ minHeight: 260 }}
            >
              {info?.provider === "COUPANG" ? (
  <div className="flex items-center justify-center">
    <div className="rounded-2xl shadow w-[250px] h-[250px] overflow-hidden bg-white">
      <iframe
        src="https://ads-partners.coupang.com/widgets.html?id=903800&template=carousel&trackingCode=AF8851731&subId=&width=250&height=250&tsource="
        width="250"
        height="250"
        frameBorder="0"
        scrolling="no"
        referrerPolicy="unsafe-url"
        // React에서는 속성 이름을 camelCase로!
        // frameborder → frameBorder, referrerpolicy → referrerPolicy
      />
    </div>
  </div>
) : (
  <div className="text-gray-500">네이버 제휴 배너</div>
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
