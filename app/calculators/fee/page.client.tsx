// app/calculators/fee/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import AdBannerMobile from "@/components/AdBannerMobile";
import CalculatorNav from "@/components/CalculatorNav";

/* ========= 유틸 ========= */
function cleanNumber(s: string): number {
  if (!s) return 0;
  return parseFloat(String(s).replace(/,/g, "")) || 0;
}
function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = (intPart ? Number(intPart) : 0).toLocaleString("ko-KR");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}
function formatMoney(n: number, maximumFractionDigits = 0) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits });
}

/* ========= 공통 아코디언 ========= */
function Accordion({
  title,
  children,
  initiallyOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[16px] font-semibold text-gray-900">{title}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`px-4 pb-4 text-gray-700 text-[15px] ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

/* ========= FAQ 아이템 ========= */
function FaqItem({ q, children }: { q: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[16px] font-semibold text-gray-900">{"Q. "}{q}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`px-4 pb-4 text-gray-700 text-[15px] ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

/* ========= 페이지 ========= */
export default function FeeCalculatorPage() {
  const [activeTab, setActiveTab] = useState<"domestic" | "us">("domestic");

  // 입력값
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [qty, setQty] = useState("");

  // 국내 시장 타입 (세율 자동 반영)
  const [krMarket, setKrMarket] = useState<"kospi" | "kosdaq" | "etf">("kospi");

  // 고급설정(커스텀 수수료율/세율)
  const [useCustom, setUseCustom] = useState(false);
  const [buyFeeRate, setBuyFeeRate] = useState("0.015");   // %
  const [sellFeeRate, setSellFeeRate] = useState("0.015");  // %
  const [taxRate, setTaxRate] = useState("0.20");           // % (국내 거래세, 미국은 SEC fee로 사용)

  // 결과
  const [result, setResult] = useState<null | {
    totalBuy: number;
    totalSell: number;
    buyFee: number;
    sellFee: number;
    tax: number;     // 국내: 거래세, 미국: SEC fee(매도 기준)
    profit: number;  // 총 손익(세후)
    receive: number; // 실수령액(세후)
  }>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) =>
    setter(formatNumberString(v));

  // 탭별 기본 수수료/세율(%) 반환
  const getDefaultRates = () => {
    if (activeTab === "domestic") {
      // 일반적인 예시값: 수수료 각 0.015%, 거래세 코스피 0.20% / 코스닥 0.23% / ETF 0%
      const buy = 0.015;
      const sell = 0.015;
      const tax =
        krMarket === "kospi" ? 0.20 :
        krMarket === "kosdaq" ? 0.23 : 0.0;
      return { buy, sell, tax };
    } else {
      // 미국 예시값: 수수료 각 0.25%, SEC fee(매도금액 기준) 0.0008%
      // *증권사/시점별로 상이 → 고급설정에서 수정 가능
      return { buy: 0.25, sell: 0.25, tax: 0.0008 };
    }
  };

  const calculate = () => {
    const buy = cleanNumber(buyPrice);
    const sell = cleanNumber(sellPrice);
    const count = cleanNumber(qty);

    if (!buy || !sell || !count) {
      setResult(null);
      return;
    }

    const { buy: defBuy, sell: defSell, tax: defTax } = getDefaultRates();

    // 최종 적용 비율(%) → 소수 변환은 아래서 수행
    const appliedBuyFeePct = useCustom ? parseFloat(buyFeeRate) || 0 : defBuy;
    const appliedSellFeePct = useCustom ? parseFloat(sellFeeRate) || 0 : defSell;
    const appliedTaxPct = useCustom ? parseFloat(taxRate) || 0 : defTax;

    const totalBuy = buy * count;
    const totalSell = sell * count;

    // 퍼센트(%) → 소수 변환
    const buyFee = totalBuy * (appliedBuyFeePct / 100);
    const sellFee = totalSell * (appliedSellFeePct / 100);

    // 국내: 거래세(매도금액 기준), 미국: SEC fee(매도금액 기준)로 동일 처리
    const tax = totalSell * (appliedTaxPct / 100);

    // 손익/실수령
    const profit = totalSell - totalBuy - buyFee - sellFee - tax;
    const receive = totalSell - sellFee - tax;

    setResult({
      totalBuy,
      totalSell,
      buyFee,
      sellFee,
      tax,
      profit,
      receive,
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const resetAll = () => {
    setBuyPrice("");
    setSellPrice("");
    setQty("");
    setResult(null);
  };

  const isUS = activeTab === "us";
  const curr = isUS ? "$" : "원";
  const moneyDigits = isUS ? 2 : 0; // 표시 소수자릿수(미국은 2자리 표시 권장)

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
       {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 수수료 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 매수·매도 금액과 수량을 입력하면 <b>수수료/세금이 반영된 실수령액·총 손익</b>을 계산합니다.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li><b>국내주식·미국주식</b> 모두 가능하며 시장에 따라 세율 선택 가능합니다.</li>
      <li>증권사별 수수료/세율은 <b>고급설정</b>에서 직접 수정하세요.</li>
      <li>ETF(국내)는 거래세는 0% 입니다.(수수료는 발생)</li>
    </ul>
  </div>
</header>
<CalculatorNav />
{/* ✅ AdSense 광고 영역 */}
      <div className="my-8">
        <div className="mx-auto w-full max-w-[1000px] px-4">
          <AdBanner slot="2809714485" />
        </div>
      </div>

        {/* 입력 카드 */}
        <section className="rounded-2xl bg-white shadow p-6 space-y-5">
          {/* 탭 */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("domestic")}
              className={`flex-1 py-3 text-lg font-bold rounded-2xl shadow transition-all 
                ${activeTab === "domestic" ? "bg-blue-600 text-white scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🇰🇷 국내주식
            </button>
            <button
              onClick={() => setActiveTab("us")}
              className={`flex-1 py-3 text-lg font-bold rounded-2xl shadow transition-all 
                ${activeTab === "us" ? "bg-green-600 text-white scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🇺🇸 미국주식(해외주식)
            </button>
          </div>

          {/* 국내 시장 선택 */}
          {activeTab === "domestic" && (
            <div>
              <label className="block mb-1 font-semibold text-gray-800">시장</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setKrMarket("kospi")}
                  className={`px-3 py-2 rounded-lg border text-sm ${krMarket === "kospi" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50"}`}
                >
                  코스피 (거래세 0.20%)
                </button>
                <button
                  onClick={() => setKrMarket("kosdaq")}
                  className={`px-3 py-2 rounded-lg border text-sm ${krMarket === "kosdaq" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50"}`}
                >
                  코스닥 (거래세 0.23%)
                </button>
                <button
                  onClick={() => setKrMarket("etf")}
                  className={`px-3 py-2 rounded-lg border text-sm ${krMarket === "etf" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50"}`}
                >
                  ETF (거래세 0%)
                </button>
              </div>
            </div>
          )}

          {/* 입력 필드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">
                {isUS ? "매수 단가 ($)" : "매수 단가 (원)"}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => onChange(setBuyPrice)(e.target.value)}
                placeholder={isUS ? "예: 120.5" : "예: 70,000"}
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">
                {isUS ? "매도 단가 ($)" : "매도 단가 (원)"}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => onChange(setSellPrice)(e.target.value)}
                placeholder={isUS ? "예: 135.2" : "예: 75,000"}
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">수량 (주)</label>
              <input
                type="text"
                inputMode="decimal"
                value={qty}
                onChange={(e) => onChange(setQty)(e.target.value)}
                placeholder="예: 10"
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* 고급설정: 수수료/세율 직접 설정 */}
          <Accordion title="⚙️ 고급설정 (수수료/세율 직접 입력)" initiallyOpen={false}>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                />
                사용자 지정 비율 사용
              </label>
              {!useCustom && (
                <span className="text-xs text-gray-500">
                  (해제 시 {activeTab === "domestic" ? "시장 기본값" : "미국 기본값"} 자동 적용)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  매수 수수료율 (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={buyFeeRate}
                  onChange={(e) => setBuyFeeRate(e.target.value)}
                  disabled={!useCustom}
                  placeholder={activeTab === "domestic" ? "예: 0.015" : "예: 0.25"}
                  className={`w-full rounded-md border px-4 py-2 outline-none focus:ring-2 font-semibold ${useCustom ? "border-gray-300 focus:ring-blue-500" : "bg-gray-100 border-gray-200 text-gray-500"}`}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  매도 수수료율 (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sellFeeRate}
                  onChange={(e) => setSellFeeRate(e.target.value)}
                  disabled={!useCustom}
                  placeholder={activeTab === "domestic" ? "예: 0.015" : "예: 0.25"}
                  className={`w-full rounded-md border px-4 py-2 outline-none focus:ring-2 font-semibold ${useCustom ? "border-gray-300 focus:ring-blue-500" : "bg-gray-100 border-gray-200 text-gray-500"}`}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  {activeTab === "domestic" ? "거래세율 (%)" : "SEC fee 비율 (%)"}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  disabled={!useCustom}
                  placeholder={activeTab === "domestic" ? (krMarket === "kosdaq" ? "0.23" : krMarket === "kospi" ? "0.20" : "0") : "0.0008"}
                  className={`w-full rounded-md border px-4 py-2 outline-none focus:ring-2 font-semibold ${useCustom ? "border-gray-300 focus:ring-blue-500" : "bg-gray-100 border-gray-200 text-gray-500"}`}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              ※ 증권사/시점마다 실제 비율은 다를 수 있습니다. 환전·유관기관 수수료 등은 별도입니다.
            </p>
          </Accordion>

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={calculate}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
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
                  <span className="text-gray-600">총 매수금액</span>
                  <span className="font-semibold">
                    {isUS ? `${curr}${formatMoney(result.totalBuy, moneyDigits)}` : `${formatMoney(result.totalBuy)} ${curr}`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매도금액</span>
                  <span className="font-semibold text-blue-600">
                    {isUS ? `${curr}${formatMoney(result.totalSell, moneyDigits)}` : `${formatMoney(result.totalSell)} ${curr}`}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">{isUS ? "매수 수수료" : "매수 수수료"}</span>
                  <span className="font-semibold text-red-600">
                    {isUS ? `${curr}${formatMoney(result.buyFee, moneyDigits)}` : `${formatMoney(result.buyFee)} ${curr}`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">{isUS ? "매도 수수료" : "매도 수수료"}</span>
                  <span className="font-semibold text-red-600">
                    {isUS ? `${curr}${formatMoney(result.sellFee, moneyDigits)}` : `${formatMoney(result.sellFee)} ${curr}`}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">{activeTab === "domestic" ? "증권거래세" : "SEC fee (매도 기준)"}</span>
                  <span className="font-semibold text-red-600">
                    {isUS ? `${curr}${formatMoney(result.tax, moneyDigits)}` : `${formatMoney(result.tax)} ${curr}`}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">실수령액(세후)</span>
                  <span className="font-semibold text-green-600">
                    {isUS ? `${curr}${formatMoney(result.receive, moneyDigits)}` : `${formatMoney(result.receive)} ${curr}`}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">총 수익(수수료·세금 반영)</span>
                  <span className={`font-semibold ${result.profit >= 0 ? "text-red-600" : "text-blue-600"}`}>
                    {isUS ? `${curr}${formatMoney(result.profit, moneyDigits)}` : `${formatMoney(result.profit)} ${curr}`}
                  </span>
                </div>
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


        {/* 사용방법/공식/FAQ */}
        <section className="mt-10 space-y-6">
          {/* 사용방법 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
              <li>상단에서 <b>국내주식/미국주식</b>을 선택합니다. 국내는 시장(코스피/코스닥/ETF)도 선택하세요.</li>
              <li>매수 단가, 매도 단가, 수량을 입력합니다. (소수점 입력 가능)</li>
              <li><b>고급설정</b>에서 수수료/세율을 직접 조정할 수 있습니다.</li>
              <li>계산하기를 누르면 <b>수수료와 세금</b>이 반영된 <b>실수령액과 총 손익</b>이 표시됩니다.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ※ 환전 수수료, 유관기관 수수료, 거래소별 부가 비용 등은 증권사 정책에 따라 별도 발생할 수 있습니다.
            </p>
          </div>

          {/* 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              수수료 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>총 매수금액</b> = 매수단가 × 수량</p>
              <p><b>총 매도금액</b> = 매도단가 × 수량</p>
              <p><b>매수 수수료</b> = 총 매수금액 × 매수 수수료율</p>
              <p><b>매도 수수료</b> = 총 매도금액 × 매도 수수료율</p>
              <p><b>거래세/SEC fee</b> = 총 매도금액 × 세율</p>
              <p><b>실수령액</b> = 총 매도금액 − 매도 수수료 − 거래세(또는 SEC fee)</p>
              <p><b>총 손익(세후)</b> = 실수령액 − (총 매수금액 + 매수 수수료)</p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시 (국내, 코스피 기준)</p>
              <ul className="list-disc list-inside">
                <li>매수 70,000원 × 10주 = 700,000원</li>
                <li>매도 75,000원 × 10주 = 750,000원</li>
                <li>매수 수수료 0.015%, 매도 수수료 0.015%, 거래세 0.20%</li>
              </ul>
              <p className="mt-1">
                → 매수 수수료 105원 / 매도 수수료 112.5원 / 거래세 1,500원<br />
                → 실수령액 = 750,000 − 112.5 − 1,500 = 748,387.5원<br />
                → 총 손익 = 748,387.5 − (700,000 + 105) = <b>48,282.5원</b>
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="수수료율은 증권사마다 다른가요?">
                <p>네. 계좌 유형(비대면/이벤트), 주문 채널(MTS/HTS) 등에 따라 달라집니다. 기본값은 예시이며, 고급설정에서 직접 입력해 실제 조건에 맞게 계산하세요.</p>
              </FaqItem>
              <FaqItem q="국내 ETF는 거래세가 없나요?">
                <p>네. 국내 상장 ETF는 거래세(매도 시)가 면제입니다. 다만 매수/매도 수수료는 부과됩니다.</p>
              </FaqItem>
              <FaqItem q="미국 주식의 SEC fee는 어떻게 반영되나요?">
                <p>SEC fee는 <b>매도 금액 기준으로 극소 비율</b>이 부과됩니다. 증권사 고지 비율이 다를 수 있어 고급설정에서 수정하세요.</p>
              </FaqItem>
              <FaqItem q="환전 수수료나 기타 비용도 포함되나요?">
                <p>아니요. 본 계산기는 매매 수수료 및 (국내)거래세/(미국)SEC fee 중심입니다. 환전, 유관기관 수수료 등은 증권사 정책에 따라 별도 발생합니다.</p>
              </FaqItem>
              <FaqItem q="소수점 주식도 계산 가능한가요?">
                <p>가능합니다. 단가/수량 입력 모두 소수점 입력을 지원합니다.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
