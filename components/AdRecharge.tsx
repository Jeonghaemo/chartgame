// components/AdRecharge.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/user";

type Provider =
  | "COUPANG"
  | "NAVER"
  | "TRIPDOTCOM"
  | "KLOOK"
  | "COUPANG_DEAL";

type NextInfo = {
  ok: boolean;
  eligible: boolean;
  remaining?: number;
  nextIndex?: number;
  provider?: string; // ← 서버가 뭘 보내든 받기 (정규화해서 사용)
};

const MIN_VIEWABLE_MS = 10_000; // 10초 노출 조건

// 외부 제휴 링크/코드
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

// 서버에서 오는 값을 대문자/트림해서 안전하게 표준화
function normProvider(p?: string | null): Provider | null {
  if (!p) return null;
  const v = p.toUpperCase().trim();
  const set = new Set<Provider>([
    "COUPANG",
    "NAVER",
    "TRIPDOTCOM",
    "KLOOK",
    "COUPANG_DEAL",
  ]);
  return set.has(v as Provider) ? (v as Provider) : null;
}

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [viewableMs, setViewableMs] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [slotVisibleMaxPct, setSlotVisibleMaxPct] = useState(0);
  const [confirmEnabled, setConfirmEnabled] = useState(false);
  const [progressSmooth, setProgressSmooth] = useState(0);
  const rafRef = useRef<number>(0);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef(true);
  const modalOpenRef = useRef(false);

  // KLOOK 재초기화를 위한 강제 리렌더 키
  const [klookKey, setKlookKey] = useState(0);

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
        provider: normProvider(info?.provider),
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

  const DAILY_LIMIT = 10;
  const label = info?.eligible
    ? `하트 무료 충전 (${info.remaining}회 남음)`
    : `오늘 충전 기회 소진(내일 ${DAILY_LIMIT}회)`;

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

  // KLOOK 위젯 재초기화: ins 렌더 후 스크립트 다시 로드
  function reloadKlookScript() {
    const ID = "klook-widget-loader";
    const old = document.getElementById(ID);
    if (old) old.remove();
    const s = document.createElement("script");
    s.id = ID;
    s.async = true;
    s.src = KLOOK_WIDGET.scriptSrc;
    document.body.appendChild(s);
  }

  const provider = normProvider(info?.provider);

  useEffect(() => {
    if (!open) return;
    if (provider !== "KLOOK") return;
    setKlookKey((k) => k + 1); // ins를 새로 렌더
    const t = setTimeout(reloadKlookScript, 0); // 스크립트 재실행
    return () => clearTimeout(t);
  }, [open, provider]);

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
            <div ref={slotRef} className="mt-4 flex items-center justify-center" style={{ minHeight: 180 }}>
              {provider === "COUPANG" && (
                <div className="rounded-2xl shadow w-[250px] h-[250px] overflow-hidden bg-white">
                  <iframe
                    title="Coupang Carousel"
                    src="https://ads-partners.coupang.com/widgets.html?id=903800&template=carousel&trackingCode=AF8851731&subId=&width=250&height=250&tsource="
                    width="250"
                    height="250"
                    frameBorder={0}
                    scrolling="no"
                    referrerPolicy="unsafe-url"
                    style={{ display: "block" }}
                  />
                </div>
              )}

              {provider === "NAVER" && (
                <a
                  href={NAVER_CONNECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl shadow w-[250px] overflow-hidden bg-white text-left"
                >
                  <div className="w-full h-[160px] bg-gray-100">
                    <img
                      src="https://shop-phinf.pstatic.net/20230211_19/1676104105485qhh9e_JPEG/77239994177191191_610733684.jpg?type=m510"
                      alt="네이버 제휴 광고 이미지"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 py-1">
                    <div className="text-sm font-semibold leading-snug truncate">
                      세로 수직 트리플 주식모니터 대형모니터암
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight truncate">
                      {NAVER_CONNECT_URL}
                    </div>
                  </div>
                </a>
              )}

              {provider === "TRIPDOTCOM" && (
                <iframe
                  title="Trip.com Affiliate"
                  src={TRIPDOTCOM_IFRAME_SRC}
                  style={{ width: "320px", height: "320px", border: "none", display: "block" }}
                  frameBorder={0}
                  scrolling="no"
                />
              )}

              {provider === "KLOOK" && (
                <div key={klookKey} className="rounded-2xl overflow-hidden shadow" style={{ width: 320 }}>
                  <ins
                    className="klk-aff-widget"
                    data-wid={KLOOK_WIDGET.wid}
                    data-height={KLOOK_WIDGET.height}
                    data-adid={KLOOK_WIDGET.adid}
                    data-lang={KLOOK_WIDGET.lang}
                    data-prod={KLOOK_WIDGET.prod}
                    data-currency={KLOOK_WIDGET.currency}
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
                  className="block rounded-2xl overflow-hidden shadow"
                  style={{ width: 320 }}
                >
                  <img
                    src={COUPANG_DEAL_IMG}
                    alt="쿠팡 특가 배너"
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </a>
              )}

              {/* 디버그 안전망: 예상 외 provider면 텍스트 노출 */}
              {!provider && (
                <div className="text-xs text-gray-500">
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
