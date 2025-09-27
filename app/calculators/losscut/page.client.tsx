// app/calculators/losscut/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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

export default function LosscutCalculatorPage() {
  // 입력값
  const [buyPrice, setBuyPrice] = useState("");
  const [lossPercent, setLossPercent] = useState("");
  const [qty, setQty] = useState(""); // 선택 입력: 손실금액 계산용

  // 결과
  const [result, setResult] = useState<{
    stopPrice: number;
    dropAmount: number;   // 매수가 - 손절가
    dropPct: number;      // 손실률(입력값 정규화)
    expectedLoss?: number;// (선택) 손실금액 = (매수가-손절가)*수량
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) => {
    setter(formatNumberString(v));
  };

  const canCalc = () => {
    const bp = cleanNumber(buyPrice);
    const lp = parseFloat(lossPercent);
    return bp > 0 && !Number.isNaN(lp) && lp >= 0;
  };

  const calculate = () => {
    const bp = cleanNumber(buyPrice);
    const lp = parseFloat(lossPercent); // % 값 (예: 5)
    const q = cleanNumber(qty);

    if (!(bp > 0) || Number.isNaN(lp) || lp < 0) {
      setResult(null);
      return;
    }

    // 손절가 = 매수가 × (1 - 손실률/100)
    const stopPrice = bp * (1 - lp / 100);
    const dropAmount = Math.max(0, bp - stopPrice);
    const dropPct = lp; // 그대로 표시

    const expectedLoss = q > 0 ? dropAmount * q : undefined;

    setResult({
      stopPrice,
      dropAmount,
      dropPct,
      expectedLoss,
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const resetAll = () => {
    setBuyPrice("");
    setLossPercent("");
    setQty("");
    setResult(null);
  };

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 손절가 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 매수가와 손실률(%)을 입력하면 <b>손절가</b>와 <b>하락폭</b>(원·%)을 계산합니다.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li>선택 입력인 <b>수량(주)</b>을 넣으면 <b>예상 손실금액</b>도 확인할 수 있어요.</li>
      <li><b>국내·미국·해외주식</b> 모두 사용 가능하며, <b>소수점 입력</b>을 지원합니다.</li>
      <li>세금/수수료/호가단위는 반영하지 않는 <b>기준가 계산</b>입니다.</li>
    </ul>
  </div>
</header>

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
            <label className="block mb-1 font-semibold text-gray-800">손절 기준 손실률 (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={lossPercent}
              onChange={(e) => setLossPercent(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="예: 5"
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
              placeholder="예: 10"
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
                  <span className="text-gray-600">손절가</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(result.stopPrice)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">하락폭(원)</span>
                  <span className="font-semibold text-blue-600">
                    {formatMoney(result.dropAmount)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">손실률</span>
                  <span className="font-semibold text-blue-600">
                    {result.dropPct.toFixed(2)}%
                  </span>
                </div>
                {typeof result.expectedLoss === "number" && (
                  <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                    <span className="text-gray-600">예상 손실금액 (수량 반영)</span>
                    <span className="font-semibold text-blue-600">
                      {formatMoney(result.expectedLoss)} 원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 설명 / 공식 / FAQ */}
        <section className="mt-10 space-y-6">
          {/* 사용방법 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
              <li><b>매수가(원)</b>와 <b>손실률(%)</b>을 입력합니다.</li>
              <li>선택으로 <b>수량(주)</b>을 입력하면 예상 손실금액도 계산됩니다.</li>
              <li><b>계산하기</b>를 누르면 손절가, 하락폭(원·%), 예상 손실금액이 표시됩니다.</li>
              <li>이 결과는 <b>세금·수수료·호가단위</b>를 반영하지 않은 기준가입니다.</li>
            </ol>
          </div>

          {/* 계산 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              손절가 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>손절가</b> = 매수가 × (1 − 손실률 ÷ 100)</p>
              <p><b>하락폭(원)</b> = 매수가 − 손절가</p>
              <p><b>예상 손실금액</b> = 하락폭(원) × 수량(주)</p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시</p>
              <ul className="list-disc list-inside">
                <li>매수가 50,000원, 손실률 10%</li>
                <li>손절가 = 50,000 × (1 − 0.10) = 45,000원</li>
                <li>하락폭 = 5,000원, 수량 100주라면 예상 손실금액 = 500,000원</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="손절가는 꼭 설정해야 하나요?">
                <p>급등락 상황에서 감정적 결정을 줄이고 리스크를 제한하기 위한 기준입니다. 특히 초보 투자자에게 유용합니다.</p>
              </FaqItem>
              <FaqItem q="손절률은 몇 %가 적당한가요?">
                <p>일반적으로 5~15% 범위에서 종목 변동성과 본인 리스크 허용도에 맞춰 정합니다. 단기 매매는 좁게, 장기 투자는 다소 넓게 잡는 편입니다.</p>
              </FaqItem>
              <FaqItem q="손절가에 닿았는데 시장이 바로 반등하면요?">
                <p>사전 기준을 일관되게 지키는 것이 장기적으로 유리한 경우가 많습니다. 손절 후 재진입 전략을 별도로 마련해두는 것도 방법입니다.</p>
              </FaqItem>
              <FaqItem q="세금·수수료·호가단위는 반영되나요?">
                <p>아니요. 본 계산기는 기준가만 제공합니다. 실제 체결가는 수수료·세금·호가단위에 따라 차이날 수 있습니다.</p>
              </FaqItem>
              <FaqItem q="해외주식/소수점 매수도 계산 가능하나요?">
                <p>네. 소수점 입력을 지원하여 미국·해외주식에도 사용할 수 있습니다.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
