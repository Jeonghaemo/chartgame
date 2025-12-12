// app/calculators/yield/page.client.tsx
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

type Market = "domestic" | "us" | "custom";

export default function YieldCalculatorPage() {
  // 입력값
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [market, setMarket] = useState<Market>("domestic");

  // 커스텀 수수료/세율 (%)
  const [customBuyFee, setCustomBuyFee] = useState("0.015");
  const [customSellFee, setCustomSellFee] = useState("0.015");
  const [customTax, setCustomTax] = useState("0.20");

  // 결과
  const [result, setResult] = useState<{
    grossRate: number;        // 세전 수익률 (%)
    grossProfit: number;      // 세전 수익금
    netProfit: number;        // 세후(수수료+세금) 수익금
    netRate: number;          // 세후 수익률 (%)
    totalBuy: number;
    totalSell: number;
    buyFee: number;
    sellFee: number;
    tax: number;
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) => {
    setter(formatNumberString(v));
  };

  // 시장별 기본 수수료/세율 (%)
  const getRates = () => {
    if (market === "domestic") {
      return {
        buyFeePct: 0.015, // 0.015%
        sellFeePct: 0.015, // 0.015%
        taxPct: 0.20,      // 0.20% (코스피 일반 기준)
        krw: true,
      };
    }
    if (market === "us") {
      return {
        buyFeePct: 0.25,   // 0.25%
        sellFeePct: 0.25,  // 0.25%
        taxPct: 0.0008,    // 0.0008% (SEC fee, 매도 기준) - 매우 작음
        krw: false,
    };
    }
    // custom
    const bf = parseFloat(customBuyFee) || 0;
    const sf = parseFloat(customSellFee) || 0;
    const tx = parseFloat(customTax) || 0;
    return { buyFeePct: bf, sellFeePct: sf, taxPct: tx, krw: true };
  };

  const canCalc = () => {
    const b = cleanNumber(buyPrice);
    const s = cleanNumber(sellPrice);
    const q = cleanNumber(quantity);
    return b > 0 && s > 0 && q > 0;
  };

  const calculate = () => {
    if (!canCalc()) {
      setResult(null);
      return;
    }

    const b = cleanNumber(buyPrice);
    const s = cleanNumber(sellPrice);
    const q = cleanNumber(quantity);
    const { buyFeePct, sellFeePct, taxPct, krw } = getRates();

    const totalBuy = b * q;
    const totalSell = s * q;

    // 퍼센트 → 실수 변환
    const buyFeeRaw = totalBuy * (buyFeePct / 100);
    const sellFeeRaw = totalSell * (sellFeePct / 100);
    const taxRaw = totalSell * (taxPct / 100);

    // 국내는 원화 절사 감각으로 Math.floor, 미국/커스텀은 소수 허용
    const buyFee = krw ? Math.floor(buyFeeRaw) : buyFeeRaw;
    const sellFee = krw ? Math.floor(sellFeeRaw) : sellFeeRaw;
    const tax = krw ? Math.floor(taxRaw) : taxRaw;

    const grossProfit = totalSell - totalBuy;
    const netProfit = totalSell - totalBuy - buyFee - sellFee - tax;

    const grossRate = totalBuy > 0 ? (grossProfit / totalBuy) * 100 : 0;
    const netRate = totalBuy > 0 ? (netProfit / totalBuy) * 100 : 0;

    setResult({
      grossRate,
      grossProfit,
      netProfit,
      netRate,
      totalBuy,
      totalSell,
      buyFee,
      sellFee,
      tax,
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const resetAll = () => {
    setBuyPrice("");
    setSellPrice("");
    setQuantity("");
    setMarket("domestic");
    setCustomBuyFee("0.015");
    setCustomSellFee("0.015");
    setCustomTax("0.20");
    setResult(null);
  };

  const posClass = (v: number) => (v >= 0 ? "text-red-600" : "text-blue-600");

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 수익률 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 <b>매수가·현재가·수량</b>을 넣으면 <b>수익률</b>과 <b>세후 수익률</b>을 계산합니다.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li><b>국내·미국·해외주식</b> 모두 사용 가능하며, <b>소수점 입력</b>을 지원합니다.</li>
      <li>시장(국내/미국/직접입력)에 따라 <b>수수료·세금</b>을 자동 반영하거나 직접 설정할 수 있어요.</li>
      <li>증권사/시장별 실무 절사 방식을 단순화해 반영하므로 실제 체결값과 다를 수 있습니다.</li>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">매수가 (원)</label>
              <input
                type="text"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => onChange(setBuyPrice)(e.target.value)}
                placeholder="예: 50,000"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">현재가 (원)</label>
              <input
                type="text"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => onChange(setSellPrice)(e.target.value)}
                placeholder="예: 60,000"
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
          </div>

          {/* 시장 선택 & (선택) 커스텀 수수료 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">시장 선택</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="domestic">국내(기본)</option>
                <option value="us">미국</option>
                <option value="custom">직접입력</option>
              </select>
            </div>

            {market === "custom" && (
              <>
                <div>
                  <label className="block mb-1 font-semibold text-gray-800">
                    매수 수수료율 (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customBuyFee}
                    onChange={(e) => setCustomBuyFee(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                    placeholder="예: 0.015"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-800">
                    매도 수수료율(%) / 세율(%)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customSellFee}
                      onChange={(e) => setCustomSellFee(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                      placeholder="수수료 예: 0.015"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customTax}
                      onChange={(e) => setCustomTax(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                      placeholder="세율 예: 0.20"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={calculate}
              disabled={!canCalc()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              수익 계산하기
            </button>
            <button
              onClick={resetAll}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200"
            >
              초기화
            </button>
          </div>

          {/* 안내 문구 */}
          <p className="text-sm font-semibold text-gray-500 text-center">
            ※ 국내 기본값: 매수 0.015%, 매도 0.015%, 증권거래세 0.20% (코스피 일반). 미국 기본값: 매수 0.25%, 매도 0.25%, SEC fee 0.0008%.
          </p>
        </section>

        {/* 결과 */}
        <section ref={resultRef}>
          {result && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매수금액</span>
                  <span className="font-semibold">{formatMoney(result.totalBuy)} 원</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매도금액</span>
                  <span className="font-semibold text-blue-600">{formatMoney(result.totalSell)} 원</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">매수 수수료</span>
                  <span className="font-semibold text-blue-600">{formatMoney(result.buyFee)} 원</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">매도 수수료</span>
                  <span className="font-semibold text-blue-600">{formatMoney(result.sellFee)} 원</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">세금</span>
                  <span className="font-semibold text-blue-600">{formatMoney(result.tax)} 원</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">세전 수익금</span>
                  <span className={`font-semibold ${posClass(result.grossProfit)}`}>
                    {formatMoney(result.grossProfit)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">세전 수익률</span>
                  <span className={`font-semibold ${posClass(result.grossRate)}`}>
                    {formatPct(result.grossRate)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">세후 수익금(수수료·세금 반영)</span>
                  <span className={`font-semibold ${posClass(result.netProfit)}`}>
                    {formatMoney(result.netProfit)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">세후 수익률</span>
                  <span className={`font-semibold ${posClass(result.netRate)}`}>
                    {formatPct(result.netRate)}
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


        {/* 설명 / 공식 / FAQ */}
        <section className="mt-10 space-y-6">
          {/* 사용방법 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
              <li><b>매수가·현재가·수량</b>을 입력하세요. (소수점 입력 가능)</li>
              <li>시장(국내/미국/직접입력)을 선택해 <b>수수료·세금</b>을 반영하세요.</li>
              <li><b>수익 계산하기</b>를 누르면 세전/세후 수익과 수익률이 표시됩니다.</li>
              <li>실제 체결값은 증권사 수수료 정책과 절사 방식, 환전 비용 등에 따라 달라질 수 있습니다.</li>
            </ol>
          </div>

          {/* 계산 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              수익률 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>세전 수익률(%)</b> = (매도금 − 매수금) ÷ 매수금 × 100</p>
              <p><b>세후 수익률(%)</b> = (매도금 − 매수금 − 수수료 − 세금) ÷ 매수금 × 100</p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시</p>
              <ul className="list-disc list-inside">
                <li>매수: 10,000원 × 100주 = 1,000,000원</li>
                <li>매도: 12,000원 × 100주 = 1,200,000원</li>
                <li>세전 수익률 = (1,200,000 − 1,000,000) ÷ 1,000,000 × 100 = 20%</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="세전/세후 수익률이 다른 이유는 뭔가요?">
                <p>세후 수익률은 <b>수수료와 세금</b>을 차감한 결과이기 때문에 항상 세전보다 낮습니다.</p>
              </FaqItem>
              <FaqItem q="국내/미국 수수료는 정확한가요?">
                <p>증권사/계좌 혜택/시장 상황에 따라 다릅니다. 본 계산기는 일반적인 수준의 기본값을 제공하며, <b>직접입력</b>으로 조정할 수 있습니다.</p>
              </FaqItem>
              <FaqItem q="소수점 매수(소수점 주식)도 계산되나요?">
                <p>네. 가격과 수량 모두 소수점을 지원하므로 미국·해외주식의 소수점 거래도 계산할 수 있습니다.</p>
              </FaqItem>
              <FaqItem q="총 수익이 0인데 세후가 마이너스인 이유는요?">
                <p>수수료와 세금이 반영되면 실제 실현 수익은 <b>0보다 낮아질 수 있습니다</b>.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
