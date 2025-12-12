// app/calculators/target/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import AdBannerMobile from "@/components/AdBannerMobile";


/* -------- 숫자 유틸 -------- */
function cleanNumber(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}
function formatNumberString(s: string) {
  // 숫자/소수점만 허용 + 천단위 콤마 유지
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = (intPart ? Number(intPart) : 0).toLocaleString("ko-KR");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}
function formatMoney(n: number, frac = 4) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: frac });
}
function formatPct(n: number) {
  return `${n.toFixed(2)}%`;
}

/* -------- FAQ 아코디언 -------- */
function FaqItem({ q, children }: { q: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-[16px] font-semibold text-gray-900">
          {"Q. "}{q}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`px-4 pb-4 text-gray-700 text-[15px] ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

export default function TargetCalculatorPage() {
  // 입력값
  const [buyPrice, setBuyPrice] = useState("");
  const [targetYield, setTargetYield] = useState(""); // %
  const [qty, setQty] = useState(""); // (선택) 예상 수익금액 계산용

  // 결과
  const [result, setResult] = useState<{
    targetPrice: number;
    gainAmount: number;   // 목표가 - 매수가
    gainPct: number;      // 입력한 목표 수익률 정규화
    expectedProfit?: number; // (선택) 예상 수익금액 = (목표가-매수가)*수량
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) =>
    setter(formatNumberString(v));

  const canCalc = () => {
    const bp = cleanNumber(buyPrice);
    const ty = parseFloat(targetYield);
    return bp > 0 && !Number.isNaN(ty);
  };

  const calculate = () => {
    const bp = cleanNumber(buyPrice);
    const ty = parseFloat(targetYield); // % (예: 10)
    const q = cleanNumber(qty);

    if (!(bp > 0) || Number.isNaN(ty)) {
      setResult(null);
      return;
    }

    // 목표 매도가 = 매수가 × (1 + 목표수익률/100)
    const targetPrice = bp * (1 + ty / 100);
    const gainAmount = targetPrice - bp;
    const gainPct = ty;

    const expectedProfit = q > 0 ? gainAmount * q : undefined;

    setResult({
      targetPrice,
      gainAmount,
      gainPct,
      expectedProfit,
    });

    setTimeout(
      () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      80
    );
  };

  const resetAll = () => {
    setBuyPrice("");
    setTargetYield("");
    setQty("");
    setResult(null);
  };

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 목표수익률 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 <b>매수가</b>와 <b>목표 수익률(%)</b>을 입력하면 <b>목표 매도가</b>와 <b>상승폭</b>을 계산합니다.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li>선택 입력인 <b>수량(주)</b>을 넣으면 <b>예상 수익금액</b>도 확인할 수 있어요.</li>
      <li><b>국내·미국·해외주식</b> 모두 사용 가능하며, <b>소수점 입력</b>을 지원합니다.</li>
      <li>세금/수수료/호가단위는 반영하지 않는 <b>기준가 계산</b>입니다.</li>
    </ul>
  </div>
</header>
{/* ✅ AdSense 광고 영역 */}
      <div className="my-8">
        <div className="mx-auto w-full max-w-[1000px] px-4">
          <AdBanner slot="2809714485" />
        </div>
      </div>


        {/* 입력 카드 */}
        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
          <div>
            <label className="block mb-1 font-semibold text-gray-800">매수가 (원)</label>
            <input
              type="text"
              inputMode="decimal"
              value={buyPrice}
              onChange={(e) => onChange(setBuyPrice)(e.target.value)}
              placeholder="예: 75,000"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-800">목표 수익률 (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetYield}
              onChange={(e) => setTargetYield(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="예: 10"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-800">
              수량 (주) <span className="text-gray-500 text-xs">(선택)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => onChange(setQty)(e.target.value)}
              placeholder="예: 100"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={calculate}
              disabled={!canCalc()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              계산하기
            </button>
            <button
              onClick={resetAll}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200"
            >
              초기화
            </button>
          </div>
        </section>

        {/* 결과 */}
        <section ref={resultRef}>
          {result && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">목표 매도가</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(result.targetPrice)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">상승폭(원)</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(result.gainAmount)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">기대 수익률</span>
                  <span className="font-semibold text-red-600">
                    {formatPct(result.gainPct)}
                  </span>
                </div>
                {typeof result.expectedProfit === "number" && (
                  <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                    <span className="text-gray-600">예상 수익금액 (수량 반영)</span>
                    <span className="font-semibold text-red-600">
                      {formatMoney(result.expectedProfit)} 원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ✅ 결과 아래 AdSense 광고 영역 (PC/모바일 분리) */}
        <div className="my-8">
          <div className="mx-auto w-full px-0 sm:px-4">
            {/* PC 전용 */}
            <div className="hidden md:block">
              <div className="mx-auto w-full max-w-[1000px]">
                <AdBanner slot="2809714485" />
              </div>
            </div>

            {/* 모바일 전용 (320×100 고정 컨테이너) */}
            <div className="md:hidden flex justify-center">
              <div className="w-[320px] overflow-hidden">
                <AdBannerMobile slot="5937026455" />
              </div>
            </div>
          </div>
        </div>


        {/* 차트게임 CTA: 결과 아래 카드형 배너 */}
<div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-600 text-white text-center shadow-lg">
  <h3 className="text-lg font-bold mb-3">📈 이론은 계산으로, 실전은 게임으로!</h3>
  <p className="text-[16px] md:text-[17px] font-semibold opacity-95 leading-relaxed mb-4">
    <b>차트게임</b>에서 실전처럼 매수·매도로 직접 검증해보세요.<br />
    가상의 자본으로 수익률을 올려 다른 투자자들과 <b>랭킹 경쟁</b>에 도전하세요!
  </p>
  <a
    href={`/game?t=${Date.now()}`}
    className="inline-block bg-white text-indigo-700 font-semibold py-2 px-5 rounded-full shadow-sm hover:bg-gray-100 transition"
  >
    🚀 차트게임으로 연습 & 랭킹 도전하기 →
  </a>
</div>


        {/* 설명 / 공식 / FAQ */}
        <section className="mt-10 space-y-6">
          {/* 사용방법 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
              <li><b>매수가(원)</b>와 <b>목표 수익률(%)</b>을 입력합니다.</li>
              <li>선택으로 <b>수량(주)</b>을 입력하면 예상 수익금액도 계산됩니다.</li>
              <li><b>계산하기</b>를 누르면 목표 매도가, 상승폭(원·%), 예상 수익금액이 표시됩니다.</li>
              <li>본 결과는 <b>세금·수수료·호가단위</b>를 반영하지 않은 기준가입니다.</li>
            </ol>
          </div>

          {/* 계산 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              목표 수익률 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>목표 매도가</b> = 매수가 × (1 + 목표 수익률 ÷ 100)</p>
              <p><b>상승폭(원)</b> = 목표 매도가 − 매수가</p>
              <p><b>예상 수익금액</b> = 상승폭(원) × 수량(주)</p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시</p>
              <ul className="list-disc list-inside">
                <li>매수가 50,000원, 목표 수익률 20%</li>
                <li>목표 매도가 = 50,000 × (1 + 0.20) = 60,000원</li>
                <li>상승폭 = 10,000원, 수량 100주라면 예상 수익금액 = 1,000,000원</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="목표 수익률은 어느 정도가 적당한가요?">
                <p>개인의 투자 성향과 종목 변동성에 따라 다릅니다. 단기 매매는 보통 3~10%, 스윙/중장기는 10~30% 정도 목표로 합니다.</p>
              </FaqItem>
              <FaqItem q="목표가에 도달하면 반드시 매도해야 하나요?">
                <p>반드시 그렇진 않지만 매매원칙을 지키는 것이 좋습니다. 분할 매도나 트레일링 스탑과 함께 쓰면 유연하게 대응할 수 있습니다.</p>
              </FaqItem>
              <FaqItem q="수수료·세금은 반영되나요?">
                <p>아니요. 본 계산기는 기준가만 제공합니다. 실제 실현수익은 수수료·세금·환전비용(해외) 등을 고려하세요.</p>
              </FaqItem>
              <FaqItem q="목표 매도가가 정해져 있을 때 예상 수익률만 알고 싶어요.">
                <p>수익률 계산기를 사용하면 매수가와 목표 매도가를 넣고 바로 수익률(%)을 확인할 수 있습니다.</p>
              </FaqItem>
              <FaqItem q="해외주식이나 소수점 매수도 지원하나요?">
                <p>네. 가격/수량 모두 소수점 입력을 지원하므로 미국·해외주식 및 소수점 거래에도 사용할 수 있습니다.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
