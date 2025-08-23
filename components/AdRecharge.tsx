// components/AdRecharge.tsx
"use client";

import { useEffect, useState } from "react";
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
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

export default function AdRecharge() {
  const [info, setInfo] = useState<NextInfo | null>(null);
  const [cool, setCool] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const setFromMe = useUserStore((s) => s.setFromMe);

  const load = async () => {
    const r = await fetch("/api/ads/next", { cache: "no-store" });
    if (!r.ok) { setInfo(null); return; }
    const j = await r.json();
    setInfo(j);
    if (!j.eligible && j.cooldownSeconds) setCool(j.cooldownSeconds);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!cool || cool <= 0) return;
    const id = setInterval(() => setCool(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cool]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleGoAd = () => {
    if (!info?.eligible || !info.provider) return;
    const url = `/api/ads/redirect?provider=${info.provider.toLowerCase()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const afterClickConfirm = async () => {
    // 1) 서버 상태 리로드(다음 순서/쿨타임 갱신)
    await load();
    // 2) 유저 스토어 즉시 동기화 → 헤더 숫자 즉시 반영
    await setFromMe();
    setOpen(false);
  };

  const label =
    info?.eligible
      ? `하트 무료 충전 (${info.remaining}회 남음) - ${info.provider === "COUPANG" ? "쿠팡" : "네이버"}`
      : info?.reason === "DAILY_LIMIT"
      ? "오늘 충전 기회 소진(내일 4회)"
      : `쿨타임 진행 중: ${formatHMS(cool)}`;

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">❤️ 하트 무료 충전</div>
        <button
          disabled={!info?.eligible}
          onClick={handleOpen}
          className={`rounded-lg px-3 py-1.5 text-sm ${info?.eligible ? "bg-black text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
        >
          {label}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center">
          <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-bold">광고 시청으로 하트 +1</div>
            <div className="mt-2 text-sm text-gray-600">
              광고를 클릭하면 새 탭에서 열립니다. 클릭이 확인되면 하트가 1개 충전됩니다.
            </div>

            <div className="mt-4 h-40 rounded-xl border grid place-items-center">
              <div className="text-gray-500">
                {info?.provider === "COUPANG" ? "쿠팡 배너" : "네이버 쇼핑 커넥트"}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={handleClose} className="rounded-xl border px-4 py-2">닫기</button>
              <button
                onClick={handleGoAd}
                className="rounded-xl bg-black text-white px-4 py-2 font-semibold"
                disabled={!info?.eligible}
              >
                광고 보러가기
              </button>
              <button
                onClick={afterClickConfirm}
                className="rounded-xl bg-green-600 text-white px-4 py-2 font-semibold"
              >
                충전 확인
              </button>
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
