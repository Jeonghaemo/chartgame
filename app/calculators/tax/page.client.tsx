"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import AdBannerMobile from "@/components/AdBannerMobile";
import CalculatorNav from "@/components/CalculatorNav";
import CalculatorBottomNav from "@/components/CalculatorBottomNav";

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
function formatMoney(n: number, frac = 0) {
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

type ResultOverseas = {
  totalBuy: number;
  totalSell: number;
  gain: number;
  taxable: number;
  tax: number;
  afterTaxProfit: number;
  baseDeduction: number;
  wasConvertedByFx: boolean;
};
type ResultDomestic = {
  totalBuy: number;
  totalSell: number;
  gain: number;
};

export default function TaxCalculatorPage() {
  const [activeTab, setActiveTab] = useState<"domestic" | "overseas">("domestic");

  // 공통 입력(금액/수량은 KRW 기준. 해외일 때는 현지통화 입력 + 환율로 환산 가능)
  const [buyPrice, setBuyPrice] = useState("");      // 매수가(단가)
  const [sellPrice, setSellPrice] = useState("");    // 매도가(단가)
  const [quantity, setQuantity] = useState("");      // 수량
  const [expense, setExpense] = useState("");        // 필요경비(수수료 등)

  // 해외 옵션
  const [baseDeduction, setBaseDeduction] = useState("2,500,000"); // 기본공제 (원) - 수정 가능
  const [fxRate, setFxRate] = useState(""); // (선택) 환율(원/현지통화), 입력 시 KRW 환산

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) => setter(formatNumberString(v));

  const canCalc = () => {
    const bp = cleanNumber(buyPrice);
    const sp = cleanNumber(sellPrice);
    const qty = cleanNumber(quantity);
    return bp > 0 && sp > 0 && qty > 0;
  };

  const calculateDomestic = (): ResultDomestic | null => {
    const bp = cleanNumber(buyPrice);
    const sp = cleanNumber(sellPrice);
    const qty = cleanNumber(quantity);
    const exp = cleanNumber(expense);

    if (!(bp > 0 && sp > 0 && qty > 0)) return null;

    const totalBuy = bp * qty;
    const totalSell = sp * qty;
    const gain = totalSell - totalBuy - exp;

    // 소액주주 장내거래 비과세(참고: 대주주/장외/비상장은 과세될 수 있음)
    return { totalBuy, totalSell, gain };
  };

  const calculateOverseas = (): ResultOverseas | null => {
    const bp = cleanNumber(buyPrice);
    const sp = cleanNumber(sellPrice);
    const qty = cleanNumber(quantity);
    const exp = cleanNumber(expense);
    const fx = cleanNumber(fxRate);
    const deduction = cleanNumber(baseDeduction) || 0;

    if (!(bp > 0 && sp > 0 && qty > 0)) return null;

    // 금액·수량이 현지통화 기준이라고 가정. 환율 입력 시 KRW 환산
    // 환율 미입력 시 이미 KRW라고 보고 그대로 처리
    const totalBuyRaw = bp * qty;
    const totalSellRaw = sp * qty;
    const totalBuy = fx > 0 ? totalBuyRaw * fx : totalBuyRaw;
    const totalSell = fx > 0 ? totalSellRaw * fx : totalSellRaw;

    const gain = totalSell - totalBuy - exp;
    const taxable = Math.max(0, gain - deduction);
    // 단순화: 22% (지방세 포함) 고정 세율
    const tax = taxable * 0.22;
    const afterTaxProfit = gain - tax;

    return {
      totalBuy,
      totalSell,
      gain,
      taxable,
      tax,
      afterTaxProfit,
      baseDeduction: deduction,
      wasConvertedByFx: fx > 0,
    };
  };

  const [resultDomestic, setResultDomestic] = useState<ResultDomestic | null>(null);
  const [resultOverseas, setResultOverseas] = useState<ResultOverseas | null>(null);

  const handleCalculate = () => {
    if (activeTab === "domestic") {
      const res = calculateDomestic();
      setResultDomestic(res);
      setResultOverseas(null);
      setTimeout(() => res && resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } else {
      const res = calculateOverseas();
      setResultOverseas(res);
      setResultDomestic(null);
      setTimeout(() => res && resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  };

  const resetAll = () => {
    setBuyPrice("");
    setSellPrice("");
    setQuantity("");
    setExpense("");
    setBaseDeduction("2,500,000");
    setFxRate("");
    setResultDomestic(null);
    setResultOverseas(null);
  };

  return (
  <>
    <main className="min-h-[70vh] bg-gray-50 pb-24 sm:pb-0">

      <div className="mx-auto max-w-5xl px-4 py-8">
       {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 양도소득세 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 <b>국내 소액주주 상장주식</b> 장내 거래는 <b>비과세</b>이며, 
      <b>해외주식</b>은 연 250만 원 기본공제를 초과한 양도차익에 대해 
      <b>22%</b> 세율로 단순 계산합니다.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li>필요경비(수수료 등)를 반영하고, 해외는 <b>(선택) 환율</b> 입력 시 원화 환산 계산합니다.</li>
      <li>대주주·장외·비상장 등은 과세 체계가 상이할 수 있음을 참고하세요.</li>
      <li>계산 결과는 <b>참고용</b>이며 실제 세액과 차이가 있을 수 있습니다.</li>
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
        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
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
              onClick={() => setActiveTab("overseas")}
              className={`flex-1 py-3 text-lg font-bold rounded-2xl shadow transition-all 
              ${activeTab === "overseas" ? "bg-green-600 text-white scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🇺🇸 미국주식(해외주식)
            </button>
          </div>

          {/* 공통 입력 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">매수가 (단가)</label>
              <input
                type="text"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => onChange(setBuyPrice)(e.target.value)}
                placeholder={activeTab === "overseas" ? "예: 75.5 (현지통화)" : "예: 75,000 (원)"}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">매도가 (단가)</label>
              <input
                type="text"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => onChange(setSellPrice)(e.target.value)}
                placeholder={activeTab === "overseas" ? "예: 100.2 (현지통화)" : "예: 100,000 (원)"}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">수량 (주)</label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => onChange(setQuantity)(e.target.value)}
                placeholder="예: 10"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">필요경비 (원)</label>
              <input
                type="text"
                inputMode="decimal"
                value={expense}
                onChange={(e) => onChange(setExpense)(e.target.value)}
                placeholder="예: 50,000"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
              <p className="mt-1 text-xs text-gray-500">수수료·제세공과금 등 필요경비가 있으면 입력</p>
            </div>
          </div>

          {/* 해외 옵션 */}
          {activeTab === "overseas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  (선택) 환율 (원 / 현지통화)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fxRate}
                  onChange={(e) => onChange(setFxRate)(e.target.value)}
                  placeholder="예: 1,350"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                />
                <p className="mt-1 text-xs text-gray-500">입력 시 현지통화 금액을 원화로 환산해 계산</p>
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  기본공제 (원)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={baseDeduction}
                  onChange={(e) => onChange(setBaseDeduction)(e.target.value)}
                  placeholder="2,500,000"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                />
                <p className="mt-1 text-xs text-gray-500">기본 2,500,000원. 필요 시 조정</p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCalculate}
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
          {activeTab === "domestic" && resultDomestic && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매수금액</span>
                  <span className="font-semibold">₩{formatMoney(resultDomestic.totalBuy)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매도금액</span>
                  <span className="font-semibold text-blue-600">₩{formatMoney(resultDomestic.totalSell)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">양도차익(필요경비 반영)</span>
                  <span className={`font-semibold ${resultDomestic.gain >= 0 ? "text-green-600" : "text-blue-600"}`}>
                    ₩{formatMoney(resultDomestic.gain)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[14px] text-gray-600">
                📢 소액주주의 상장주식 <b>장내 거래</b>는 양도소득세가 <b>비과세</b>입니다.
                (대주주·장외·비상장 등은 과세 대상일 수 있습니다.)
              </p>
            </div>
          )}

          {activeTab === "overseas" && resultOverseas && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매수금액</span>
                  <span className="font-semibold">₩{formatMoney(resultOverseas.totalBuy)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매도금액</span>
                  <span className="font-semibold text-blue-600">₩{formatMoney(resultOverseas.totalSell)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">양도차익(필요경비 반영)</span>
                  <span className={`font-semibold ${resultOverseas.gain >= 0 ? "text-green-600" : "text-blue-600"}`}>
                    ₩{formatMoney(resultOverseas.gain)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">기본공제</span>
                  <span className="font-semibold">₩{formatMoney(resultOverseas.baseDeduction)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">과세표준</span>
                  <span className="font-semibold text-red-600">₩{formatMoney(resultOverseas.taxable)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">예상 양도소득세(22%)</span>
                  <span className="font-semibold text-red-700">₩{formatMoney(resultOverseas.tax)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">세후 이익(양도차익-세액)</span>
                  <span className={`font-semibold ${resultOverseas.afterTaxProfit >= 0 ? "text-green-700" : "text-blue-600"}`}>
                    ₩{formatMoney(resultOverseas.afterTaxProfit)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[14px] text-gray-600">
                💡 해외주식은 연간 양도차익 <b>2,500,000원 초과분</b>에 대해 <b>22%</b> 단일 세율(지방세 포함)로 단순 계산합니다.
                {resultOverseas.wasConvertedByFx ? " (입력한 환율로 원화 환산됨)" : " (환율 미입력 시 원화 기준 입력으로 간주)"}
              </p>
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
              <li>국내/해외 탭을 선택하고 <b>매수가·매도가·수량</b> 그리고 <b>필요경비</b>를 입력합니다.</li>
              <li>해외는 (선택) <b>환율</b>을 입력하면 현지통화를 원화로 환산해 계산합니다.</li>
              <li>해외의 <b>기본공제(2,500,000원)</b>은 필요 시 수정할 수 있습니다.</li>
              <li><b>계산하기</b>를 누르면 양도차익·과세표준·세액(해외)을 확인할 수 있습니다.</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              ※ 본 계산기는 단순 참고용입니다. 실제 신고·납부는 국세청 안내 및 세무전문가와 확인하세요.
            </p>
          </div>

          {/* 계산 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              양도소득세 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>양도차익</b> = (매도가 × 수량) − (매수가 × 수량) − 필요경비</p>
              <p><b>해외</b> 과세표준 = max(0, 양도차익 − 기본공제 2,500,000)</p>
              <p><b>해외</b> 세액(단순화) = 과세표준 × 22% (지방소득세 포함)</p>
              <p className="text-xs text-gray-500">※ 국내 소액주주 상장주식 장내거래는 비과세로 가정합니다.</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="국내 주식은 언제 과세되나요?">
                <p>
                  일반적인 <b>소액주주의 상장주식 장내거래</b>는 비과세입니다.
                  다만 <b>대주주</b> 요건 충족, <b>장외/비상장</b> 거래 등은 과세될 수 있습니다.
                </p>
              </FaqItem>
              <FaqItem q="해외 주식은 어떻게 신고하나요?">
                <p>
                  해외주식 양도소득은 다음 해 <b>5월 종합소득세 신고</b> 기간에 신고·납부(분리과세)합니다.
                  손실·경비·환율 반영 기준은 국세청 안내를 참고하세요.
                </p>
              </FaqItem>
              <FaqItem q="환율은 어떻게 적용되나요?">
                <p>
                  통상 <b>결제일 기준 환율</b>을 사용합니다. 본 계산기는 입력한 환율이 있으면 그 값으로 환산하고,
                  없으면 이미 원화 기준 입력으로 간주해 계산합니다.
                </p>
              </FaqItem>
              <FaqItem q="손실이 나면 어떻게 되나요?">
                <p>
                  손실이면 과세표준은 0으로 처리되어 세금이 발생하지 않습니다. (단, 손실 이월공제 등은 반영하지 않습니다.)
                </p>
              </FaqItem>
              <FaqItem q="대주주/특수 사례까지 계산되나요?">
                <p>
                  본 계산기는 단순화를 위해 <b>국내 소액주주 장내거래 비과세</b>와 <b>해외 22% 단일세율</b>만 반영합니다.
                  대주주/장외/비상장/세율구간/공제특례 등은 세무전문가 상담이 필요합니다.
                </p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
     </main>

    {/* ✅ 계산기 페이지에서만: 모바일 하단 고정 네비 */}
    <CalculatorBottomNav />
  </>
);
}
