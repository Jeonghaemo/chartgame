// app/calculators/average/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import AdBannerMobile from "@/components/AdBannerMobile";
import CalculatorNav from "@/components/CalculatorNav";
import CalculatorBottomNav from "@/components/CalculatorBottomNav";


type Row = { price: string; qty: string };

// 숫자 변환 시 소수점 허용
function cleanNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 숫자 포맷 (소수점 유지, 콤마 추가)
function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = Number(intPart).toLocaleString("ko-KR");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

function formatMoney(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}
function formatPct(n: number) {
  return `${n.toFixed(2)}%`;
}

/** FAQ 아코디언 컴포넌트 */
function FaqItem({ q, children }: { q: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="text-[16px] font-semibold text-gray-900">
          {/* 항상 Q. 접두어 붙이기 */}
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

export default function AverageCalculatorPage() {
  const [currentPrice, setCurrentPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [originalQty, setOriginalQty] = useState("");
  const [adds, setAdds] = useState<Row[]>([
    { price: "", qty: "" },
    { price: "", qty: "" },
    { price: "", qty: "" },
  ]);

  const [result, setResult] = useState<{
    average: number;
    totalQty: number;
    totalCost: number;
    profitPct: number;
    profitAmt: number;
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) => {
    setter(formatNumberString(v));
  };
  const onChangeAdd = (i: number, field: keyof Row, v: string) => {
    const next = [...adds];
    next[i][field] = formatNumberString(v);
    setAdds(next);
  };

  const canCalc = () => {
    const op = cleanNumber(originalPrice);
    const oq = cleanNumber(originalQty);
    return op !== null && oq !== null && oq > 0;
  };

  const calculate = () => {
    const op = cleanNumber(originalPrice);
    const oq = cleanNumber(originalQty);
    const cp = cleanNumber(currentPrice);

    if (op === null || oq === null || oq <= 0) {
      setResult(null);
      return;
    }

    let totalCost = op * oq;
    let totalQty = oq;

    adds.forEach(({ price, qty }) => {
      const p = cleanNumber(price);
      const q = cleanNumber(qty);
      if (p !== null && q !== null && q > 0) {
        totalCost += p * q;
        totalQty += q;
      }
    });

    if (totalQty <= 0) {
      setResult(null);
      return;
    }

    const average = totalCost / totalQty;
    const profitPct =
      cp !== null && average > 0 ? ((cp - average) / average) * 100 : 0;
    const profitAmt = cp !== null ? (cp - average) * totalQty : 0;

    setResult({ average, totalQty, totalCost, profitPct, profitAmt });

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const resetAll = () => {
    setCurrentPrice("");
    setOriginalPrice("");
    setOriginalQty("");
    setAdds([
      { price: "", qty: "" },
      { price: "", qty: "" },
      { price: "", qty: "" },
    ]);
    setResult(null);
  };

  return (
  <>
    <main className="min-h-[70vh] bg-gray-50 pb-24 sm:pb-0">

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 평단가 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 기존 보유 + 추가 매수를 합산해 <b>평단가·수익률·손익금액</b>을 한눈에 확인하세요.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li>여러 번 나눠 매수한 주식의 <b>평균 단가</b>와 <b>손익률</b>을 계산할 수 있습니다.</li>
      <li><b>국내주식·미국주식·해외주식</b> 모두 계산할 수 있으며, 소수점 입력도 지원합니다.</li>
      <li>실제 증권사 평단가는 수수료, 세금, 반올림 방식에 따라 다를 수 있습니다.</li>
      <li>세금·수수료는 포함되지 않은 단순 계산이며, 참고용으로만 사용하세요.</li>
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
          {/* 현재 주가 */}
          <div>
            <label className="block mb-1 font-semibold text-gray-800">
              현재 주가 (원)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={currentPrice}
              onChange={(e) => onChange(setCurrentPrice)(e.target.value)}
              placeholder="예: 60,000"
              className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
            <p className="mt-1 text-xs font-semibold text-gray-600">
              수익률/손익금액 계산에 사용됩니다. (선택 입력)
            </p>
          </div>

          {/* 기존 매수 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">
                기존 평단가 (원)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={originalPrice}
                onChange={(e) => onChange(setOriginalPrice)(e.target.value)}
                placeholder="예: 50,000"
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">
                현재 보유 수량 (주)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={originalQty}
                onChange={(e) => onChange(setOriginalQty)(e.target.value)}
                placeholder="예: 100"
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* 추가 매수 */}
          {adds.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  추가 매수 단가 {i + 1} (원)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.price}
                  onChange={(e) => onChangeAdd(i, "price", e.target.value)}
                  placeholder="예: 48,000"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-800">
                  추가 매수 수량 {i + 1} (주)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.qty}
                  onChange={(e) => onChangeAdd(i, "qty", e.target.value)}
                  placeholder="예: 20"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>
          ))}

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={calculate}
              disabled={!canCalc()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              평단가 계산하기
            </button>
            <button
              onClick={resetAll}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200"
            >
              초기화
            </button>
          </div>

          <p className="text-sm font-semibold text-gray-500 text-center">
            ※ 최대 3회까지 추가 매수 정보를 입력할 수 있습니다.
          </p>
        </section>

        {/* 결과 */}
        <section ref={resultRef}>
          {result && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                결과
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">평단가</span>
                  <span className="font-semibold text-blue-600">
                    {formatMoney(result.average)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">수익률</span>
                  <span
                    className={`font-semibold ${
                      result.profitPct >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {formatPct(result.profitPct)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 수량</span>
                  <span className="font-semibold">
                    {formatMoney(result.totalQty)} 주
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 매수금액</span>
                  <span className="font-semibold">
                    {formatMoney(result.totalCost)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">손익금액</span>
                  <span
                    className={`font-semibold ${
                      result.profitAmt >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {formatMoney(result.profitAmt)} 원
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





        {/* 설명 섹션: 세로 카드 + FAQ 아코디언 */}
        <section className="mt-10 space-y-6">
          {/* 사용방법: 세로(풀폭) 카드 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-1 text-[15px] text-gray-700">
              <li>
                기존 <b>평단가(원)</b>와 <b>보유 수량(주)</b>을 입력합니다.{" "}
                <span className="text-gray-500">(필수)</span>
              </li>
              <li>
                <b>현재 주가(원)</b>를 입력하면 <b>수익률·손익금액</b>도 함께 계산됩니다.{" "}
                <span className="text-gray-500">(선택)</span>
              </li>
              <li>
                <b>추가 매수</b> 1~3행에 단가와 수량을 입력합니다. 비워둔 행은 자동으로 제외됩니다.
              </li>
              <li>
                <b>평단가 계산하기</b> 버튼을 누르면 평단가, 수익률, 총 수량, 총 매수금액, 손익금액이 표시됩니다.   표시됩니다.
              </li>
              <li>
                <b>초기화</b> 버튼으로 모든 입력을 한 번에 지울 수 있습니다.
              </li>
            </ol>
            <div className="mt-3 text-xs text-gray-500">
              ※ 국내 원화·정수 주식 기준입니다. 수수료·세금·최소호가는 본 계산에 포함하지 않습니다.
            </div>
          </div>

          {/* 계산 공식: 세로(풀폭) 카드 — 쉬운 설명 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              평단가 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p>
                <b>1) 총 매수금액</b> = 각 매수의 <b>단가 × 수량</b>을 모두 더한 값
              </p>
              <p>
                <b>2) 총 수량</b> = 각 매수의 <b>수량</b>을 모두 더한 값
              </p>
              <p>
                <b>3) 평균 단가(평단)</b> = <b>총 매수금액 ÷ 총 수량</b>
              </p>
              <p>
                <b>4) 수익률</b> = <b>(현재가 − 평균 단가) ÷ 평균 단가 × 100</b>
              </p>
              <p>
                <b>5) 손익금액</b> = <b>(현재가 − 평균 단가) × 총 수량</b>
              </p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시</p>
              <ul className="list-disc list-inside">
                <li>첫 매수: 10,000원 × 100주</li>
                <li>두 번째 매수: 8,000원 × 100주</li>
              </ul>
              <p className="mt-1">
                → 총 매수금액 1,800,000원 / 총 수량 200주 = <b>평균 단가 9,000원</b>
              </p>
            </div>
          </div>

          {/* FAQ 아코디언 */}
<div className="rounded-2xl bg-white shadow p-6">
  <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
    자주 묻는 질문 (FAQ)
  </h2>
  <div className="space-y-2">
    <FaqItem q={<span className="text-[16px] font-semibold">평단가는 어떻게 계산하나요?</span>}>
      <p>
        평단가는 <b>총 매수금액 ÷ 총 수량</b>으로 계산합니다.
        여러 번에 걸쳐 매수했어도 단가×수량을 모두 더한 뒤
        총 수량으로 나누면 실제 평균 매입 단가가 나옵니다.
      </p>
    </FaqItem>

    <FaqItem q={<span className="text-[16px] font-semibold">증권사 앱의 평단가와 다른 이유가 뭔가요?</span>}>
      <ul className="list-disc list-inside space-y-1">
        <li>증권사마다 <b>수수료·세금 포함 여부</b>가 다릅니다.</li>
        <li>소수점 자리수, 반올림 방식, <b>최소호가</b> 적용 여부가 달라 차이가 날 수 있습니다.</li>
        <li>부분 체결, 시간외 체결을 <b>하나로 합산</b>하는 방식이 앱마다 다릅니다.</li>
        <li>이 계산기는 <b>단순 평균</b>만 반영하므로 오차가 있을 수 있습니다.</li>
      </ul>
    </FaqItem>

    <FaqItem q={<span className="text-[16px] font-semibold">추가 매수하면 평단가는 무조건 내려가나요?</span>}>
      <p>
        아닙니다. 추가 매수 가격이 현재 평단보다 높으면 <b>평단가가 올라갑니다</b>.
        낮은 가격에 매수할 때만 평단가가 내려갑니다.
      </p>
    </FaqItem>

    <FaqItem q="평단가를 낮추는 이유는 무엇인가요?">
  <p>
    평단가를 낮추면 <b>손익분기점(본전 가격)이 내려갑니다</b>.
    즉, 주가가 이전보다 조금만 올라와도 손실을 만회할 가능성이 커집니다.
    다만 주가가 더 하락할 경우 손실이 커질 수 있으므로 <b>추가 매수는 신중</b>해야 합니다.
  </p>
</FaqItem>

    <FaqItem q={<span className="text-[16px] font-semibold">미국주식이나 소수점 매수도 계산할 수 있나요?</span>}>
      <p>
        네. 이 계산기는 <b>소수점 입력</b>을 지원합니다.
        미국주식, ETF, fractional share(소수점 주식) 모두 계산 가능합니다.
      </p>
    </FaqItem>

    <FaqItem q={<span className="text-[16px] font-semibold">수익률 계산은 어떻게 하나요?</span>}>
      <p>
        수익률 = <b>(현재가 ÷ 평단가 − 1) × 100</b> 공식으로 구합니다.
        예) 평단 10,000원 → 현재가 11,000원이면 +10% 수익률입니다.
      </p>
    </FaqItem>

    <FaqItem q={<span className="text-[16px] font-semibold">손익금액은 세금과 수수료까지 포함되나요?</span>}>
      <p>
        아닙니다. 여기서 보여주는 손익금액은 <b>세전·수수료 제외</b> 금액입니다.
        실제 실현손익은 증권사 체결내역에서 확인하세요.
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
