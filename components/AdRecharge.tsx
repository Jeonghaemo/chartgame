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
    | "TRIPDOTCOM"
    | "KLOOK"
    | "COUPANG_DEAL";
};

const MIN_VIEWABLE_MS = 10_000; // 10초 노출 조건

// --- 외부 제휴 링크/코드 ---
const NAVER_CONNECT_URL = "https://naver.me/xLsEEb1q";
const TRIPDOTCOM_IFRAME_SRC =
  "https://kr.trip.com/partners/ad/S5341905?Allianceid=6019189&SID=258928293&trip_sub1=";
const COUPANG_DEAL_URL = "https://link.coupang.com/a/cQAVnv";
const COUPANG_DEAL_IMG =
  "https://image5.coupangcdn.com/image/affiliate/event/promotion/2025/09/12/35d23a7a2263003f012224ad5532af7c.png";

const KLOOK_WIDGET = {
  wid: "99172",
  height: "340px",
  adid: "1123728",
  lang: "ko",
  prod: "search_vertical",
  currency: "KRW",
  scriptSrc: "https://affiliate.klook.com/widget/fetch-iframe-init.js",
};

// 크기 계산 상수
const DEFAULT_SLOT = 320;   // 데스크톱 기본
const MIN_SLOT = 250;       // 너무 작아지지 않도록
const VIEWPORT_RATIO_W = 0.8;
const VIEWPORT_RATIO_H = 0.6;

function calcSlotSize() {
  if (typeof window === "undefined") return DEFAULT_SLOT;
  const vw = window.innerWidth || 360;
  const vh = window.innerHeight || 640;
  const maxByW = Math.floor(vw * VIEWPORT_RATIO_W);
  const maxByH = Math.floor(vh * VIEWPORT_RATIO_H);
  const cap = Math.min(DEFAULT_SLOT, maxByW, maxByH);
  return Math.max(MIN_SLOT, cap);
}

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [slotSize, setSlotSize] = useState<number>(DEFAULT_SLOT);

  const [viewableMs, setViewableMs] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [slotVisibleMaxPct, setSlotVisibleMaxPct] = useState(0);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  const [progressSmooth, setProgressSmooth] = useState(0);
  const rafRef = useRef<number>(0);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef<boolean>(true);
  const modalOpenRef = useRef<boolean>(false);

  const setFromMe = useUserStore((s) => s.setFromMe);

  const load = async () => {
    const r = await fetch("/api/ads/next", { cache: "no-store" });
    if (!r.ok) return setInfo(null);
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
    setSlotSize(calcSlotSize());
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
      await load();
      await setFromMe();
      setOpen(false);
      modalOpenRef.current = false;
    }
  };

  const DAILY_LIMIT = 5; // ✅ 10회 → 5회로 변경
  const label = info?.eligible
    ? `하트 무료 충전 (${info.remaining}회 남음)`
    : `오늘 충전 기회 소진(내일 ${DAILY_LIMIT}회)`;

  // 모달 열릴 때 slotSize 다시 계산 + 리사이즈 대응
  useEffect(() => {
    if (!open) return;
    const apply = () => setSlotSize(calcSlotSize());
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, [open]);

  // 노출 체크
  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      activeRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    const markInteract = () => setInteracted(true);
    ["scroll", "keydown", "mousemove", "touchstart", "pointerdown"].forEach((ev) =>
      window.addEventListener(ev, markInteract, { once: true, passive: true })
    );

    const isVisByRect = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const interW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const interH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const ratio = (interW * interH) / Math.max(1, r.width * r.height);
      return ratio >= 0.25;
    };

    let io: IntersectionObserver | null = null;
    if (slotRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          const ratio = e?.intersectionRatio ?? 0;
          visibleRef.current = !!(e?.isIntersecting && ratio >= 0.25);
          setSlotVisibleMaxPct((p) => Math.max(p, ratio));
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      io.observe(slotRef.current);
    }

    const id = setInterval(() => {
      const rectVis = isVisByRect(slotRef.current!);
      if ((visibleRef.current || rectVis) && activeRef.current && modalOpenRef.current) {
        setViewableMs((ms) => ms + 200);
      }
    }, 200);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      ["scroll", "keydown", "mousemove", "touchstart", "pointerdown"].forEach((ev) =>
        window.removeEventListener(ev, markInteract)
      );
      if (io && slotRef.current) io.unobserve(slotRef.current);
      clearInterval(id);
    };
  }, [open]);

  useEffect(() => {
    if (open && info?.provider === "KLOOK") {
      const id = "klook-widget-loader";
      if (!document.getElementById(id)) {
        const s = document.createElement("script");
        s.id = id;
        s.async = true;
        s.src = KLOOK_WIDGET.scriptSrc;
        document.body.appendChild(s);
      }
    }
  }, [open, info?.provider]);

  useEffect(() => {
    setConfirmEnabled(viewableMs >= MIN_VIEWABLE_MS);
  }, [viewableMs]);

  useEffect(() => {
    const target = Math.min(100, (viewableMs / MIN_VIEWABLE_MS) * 100);
    cancelAnimationFrame(rafRef.current);
    const animate = () => {
      setProgressSmooth((curr) => {
        const diff = target - curr;
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
  const provider = info?.provider;

  return (
    <div className="rounded-2xl bg-white border p-6 text-center">
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
            <div className="text-lg font-bold">하트 무료 충전</div>
            <div className="mt-2 text-sm text-gray-600">제휴/광고 콘텐츠가 포함될 수 있습니다.</div>

            {/* 광고 슬롯 */}
            <div
              ref={slotRef}
              className="mt-4 flex items-center justify-center"
              style={{ minHeight: slotSize }}
            >
              {provider === "COUPANG" && (
                <div className="rounded-2xl shadow overflow-hidden bg-white" style={{ width: slotSize, height: slotSize }}>
                  <iframe
                    title="Coupang Carousel"
                    src={`https://ads-partners.coupang.com/widgets.html?id=903800&template=carousel&trackingCode=AF8851731&subId=&width=${slotSize}&height=${slotSize}&tsource=`}
                    width={slotSize}
                    height={slotSize}
                    frameBorder={0}
                    scrolling="no"
                    loading="lazy"
                    referrerPolicy="unsafe-url"
                    style={{ display: "block", border: "none" }}
                  />
                </div>
              )}

              {provider === "NAVER" && (
                <a
                  href={NAVER_CONNECT_URL}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="rounded-2xl shadow overflow-hidden bg-white text-left block"
                  style={{ width: slotSize, height: slotSize }}
                  onClick={() => setInteracted(true)}
                >
                  <div className="w-full h-full bg-white grid place-items-center p-2">
                    <img
                      src="https://shop-phinf.pstatic.net/20230211_19/1676104105485qhh9e_JPEG/77239994177191191_610733684.jpg?type=m510"
                      alt="네이버 제휴 광고 이미지"
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </a>
              )}

              {provider === "TRIPDOTCOM" && (
                <div className="rounded-2xl shadow overflow-hidden bg-white" style={{ width: slotSize, height: slotSize }}>
                  <iframe
                    title="Trip.com Affiliate"
                    src={TRIPDOTCOM_IFRAME_SRC}
                    width={slotSize}
                    height={slotSize}
                    frameBorder={0}
                    scrolling="no"
                    loading="lazy"
                    style={{ display: "block", border: "none" }}
                  />
                </div>
              )}

              {provider === "KLOOK" && (
                <div key="klook-key" className="rounded-2xl overflow-hidden shadow bg-white" style={{ width: slotSize, height: slotSize }}>
                  <ins
                    className="klk-aff-widget"
                    data-wid={KLOOK_WIDGET.wid}
                    data-height={`${slotSize}px`}
                    data-adid={KLOOK_WIDGET.adid}
                    data-lang={KLOOK_WIDGET.lang}
                    data-prod={KLOOK_WIDGET.prod}
                    data-currency={KLOOK_WIDGET.currency}
                    style={{ display: "block", width: slotSize, height: slotSize }}
                  >
                    <a href="//www.klook.com/?aid=">Klook.com</a>
                  </ins>
                </div>
              )}

              {provider === "COUPANG_DEAL" && (
                <a
                  href={COUPANG_DEAL_URL}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  onClick={() => setInteracted(true)}
                  className="block rounded-2xl overflow-hidden shadow bg-white"
                  style={{ width: slotSize, height: slotSize }}
                >
                  <img
                    src={COUPANG_DEAL_IMG}
                    alt="쿠팡 특가 배너"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </a>
              )}

              {!provider && (
                <div className="text-xs text-gray-500" style={{ width: slotSize, height: slotSize }}>
                  지원하지 않는 provider 값입니다. 서버값: {String(info?.provider ?? "null")}
                </div>
              )}
            </div>

            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div className="h-2 bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-500">{Math.ceil(MIN_VIEWABLE_MS / 1000)}초 후 활성화</div>
            </div>

            {/* 버튼 */}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={handleClose} className="rounded-xl border px-4 py-2">
                닫기
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmEnabled}
                className={`rounded-xl px-4 py-2 font-semibold ${
                  confirmEnabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                하트 충전 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
