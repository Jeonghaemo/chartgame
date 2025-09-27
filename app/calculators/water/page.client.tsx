// app/calculators/water/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Row = { price: string; qty: string };

/* ===== 숫자 유틸 (소수점 허용 + 천단위 유지) ===== */
function cleanNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = Number(intPart || "0").toLocaleString("ko-KR");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

function formatMoney(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}
function formatPct(n: number) {
  return `${n.toFixed(2)}%`;
}

/* ===== FAQ 아코디언 ===== */
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

export default function WaterCalculatorPage() {
  // 입력값
  const [currentPrice, setCurrentPrice] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [currentQty, setCurrentQty] = useState("");

  // 추가 매수(최대 3행, 비워두면 자동 제외)
  const [adds, setAdds] = useState<Row[]>([
    { price: "", qty: "" },
    { price: "", qty: "" },
    { price: "", qty: "" },
  ]);

  // 결과
  const [result, setResult] = useState<{
    newAverage: number;
    totalQty: number;
    totalCost: number;
    beforeProfitPct: number;
    afterProfitPct: number;
    afterProfitAmt: number;
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
    const ap = cleanNumber(avgPrice);
    const q = cleanNumber(currentQty);
    return ap !== null && ap > 0 && q !== null && q > 0;
  };

  const calculate = () => {
    const cp = cleanNumber(currentPrice);     // 현재가(선택)
    const ap = cleanNumber(avgPrice);         // 기존 평단가(필수)
    const q0 = cleanNumber(currentQty);       // 기존 수량(필수)

    if (ap === null || ap <= 0 || q0 === null || q0 <= 0) {
      setResult(null);
      return;
    }

    // 기존 포지션
    let totalCost = ap * q0;
    let totalQty = q0;

    // 추가 매수 누적
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

    const newAverage = totalCost / totalQty;

    // 물타기 전/후 수익률 (현재가 입력 시 계산, 없으면 0)
    const beforeProfitPct =
      cp !== null && ap > 0 ? ((cp - ap) / ap) * 100 : 0;
    const afterProfitPct =
      cp !== null && newAverage > 0 ? ((cp - newAverage) / newAverage) * 100 : 0;

    // 물타기 후 손익금액(현재가 기준)
    const afterProfitAmt =
      cp !== null ? (cp - newAverage) * totalQty : 0;

    setResult({
      newAverage,
      totalQty,
      totalCost,
      beforeProfitPct,
      afterProfitPct,
      afterProfitAmt,
    });

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const resetAll = () => {
    setCurrentPrice("");
    setAvgPrice("");
    setCurrentQty("");
    setAdds([
      { price: "", qty: "" },
      { price: "", qty: "" },
      { price: "", qty: "" },
    ]);
    setResult(null);
  };

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    주식 물타기 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 <b>기존 평단·수량</b>과 <b>추가 매수(최대 3회)</b>를 입력해
      <b> 최종 평단가·수익률</b>을 확인하세요.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li><b>국내주식·미국주식·해외주식</b> 모두 계산 가능 합니다.(소수점 입력 지원)</li>
      <li>비워둔 추가 매수 행은 자동 제외됩니다.</li>
      <li>세금·수수료·호가단위는 미반영 됩니다.</li>
    </ul>
  </div>
</header>

        {/* 입력 카드 */}
        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
          {/* 현재 주가 (선택) */}
          <div>
            <label className="block mb-1 font-semibold text-gray-800">
              현재 주가 (원) <span className="text-xs text-gray-500">(선택)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={currentPrice}
              onChange={(e) => onChange(setCurrentPrice)(e.target.value)}
              placeholder="예: 13,000"
              className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
            <p className="mt-1 text-xs font-semibold text-gray-600">
              현재가 입력 시 물타기 전/후 수익률과 손익금액을 계산합니다.
            </p>
          </div>

          {/* 기존 포지션 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">현재 평단가 (원)</label>
              <input
                type="text"
                inputMode="decimal"
                value={avgPrice}
                onChange={(e) => onChange(setAvgPrice)(e.target.value)}
                placeholder="예: 15,000"
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-800">현재 보유 수량 (주)</label>
              <input
                type="text"
                inputMode="decimal"
                value={currentQty}
                onChange={(e) => onChange(setCurrentQty)(e.target.value)}
                placeholder="예: 20"
                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* 추가 매수 (최대 3행) */}
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
                  placeholder="예: 13,000"
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
                  placeholder="예: 10"
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
              물타기 계산하기
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
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">최종 평단가</span>
                  <span className="font-semibold text-blue-600">
                    {formatMoney(result.newAverage)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">물타기 전 수익률</span>
                  <span
                    className={`font-semibold ${
                      result.beforeProfitPct >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {formatPct(result.beforeProfitPct)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">물타기 후 수익률</span>
                  <span
                    className={`font-semibold ${
                      result.afterProfitPct >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {formatPct(result.afterProfitPct)}
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
                  <span className="text-gray-600">손익금액(물타기 후, 현재가 기준)</span>
                  <span
                    className={`font-semibold ${
                      result.afterProfitAmt >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {formatMoney(result.afterProfitAmt)} 원
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 설명/공식/FAQ */}
        <section className="mt-10 space-y-6">
          {/* 사용방법 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-1 text-[15px] text-gray-700">
              <li>
                <b>현재 평단가(원)</b>와 <b>현재 보유 수량(주)</b>을 입력합니다. <span className="text-gray-500">(필수)</span>
              </li>
              <li>
                <b>현재 주가(원)</b>를 입력하면 <b>물타기 전/후 수익률·손익금액</b>이 계산됩니다. <span className="text-gray-500">(선택)</span>
              </li>
              <li>
                <b>추가 매수</b> 1~3행에 단가와 수량을 입력합니다. 비워둔 행은 자동으로 제외됩니다.
              </li>
              <li>
                <b>물타기 계산하기</b> 버튼을 누르면 최종 평단가, 수익률, 총 수량, 총 매수금액, 손익금액이 표시됩니다.
              </li>
              <li>
                <b>초기화</b> 버튼으로 모든 입력을 한 번에 지울 수 있습니다.
              </li>
            </ol>
            <div className="mt-3 text-xs text-gray-500">
              ※ 세금·수수료·호가단위는 미반영(참고용)
            </div>
          </div>

          {/* 계산 공식 */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              물타기 계산 공식
            </h2>
            <div className="text-[15px] text-gray-700 space-y-2">
              <p><b>1) 총 매수금액</b> = 각 매수의 <b>단가 × 수량</b>의 합</p>
              <p><b>2) 총 수량</b> = 각 매수의 <b>수량</b>의 합</p>
              <p><b>3) 최종 평단가</b> = <b>총 매수금액 ÷ 총 수량</b></p>
              <p><b>4) 수익률</b> = <b>(현재가 − 평단가) ÷ 평단가 × 100</b></p>
              <p><b>5) 손익금액</b> = <b>(현재가 − 평단가) × 총 수량</b></p>
            </div>
            <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-[14px] text-gray-700">
              <p className="font-semibold">예시</p>
              <ul className="list-disc list-inside">
                <li>기존: 20,000원 × 50주</li>
                <li>추가: 15,000원 × 50주</li>
              </ul>
              <p className="mt-1">→ 총 매수금액 1,750,000원 / 총 수량 100주 = <b>평단가 17,500원</b></p>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q={<span className="text-[16px] font-semibold">물타기를 하면 무조건 손해를 줄일 수 있나요?</span>}>
                <p>아닙니다. 평단은 낮아지지만 주가가 더 하락하면 손실이 커질 수 있습니다. 다만 주가가 상승한다면 손해를 줄일 수 있거나 수익으로 전환할 수  있습니다.</p>
              </FaqItem>

              <FaqItem q={<span className="text-[16px] font-semibold">몇 번까지 물타기하는 게 좋을까요?</span>}>
                <p>정답은 없지만 반복할수록 리스크가 커집니다. 총 투자금과 비중 한도를 정해 분할 매수 하는것이 좋습니다.</p>
              </FaqItem>

              <FaqItem q={<span className="text-[16px] font-semibold">평단가가 낮아지면 바로 수익이 나나요?</span>}>
                <p>아니요. <b>현재가가 평단가보다 높아야</b> 수익입니다. 주가가 상승하면 본전이나 수익 전환이 빨리 될 수 있습니다.</p>
              </FaqItem>

              <FaqItem q={<span className="text-[16px] font-semibold">수수료/세금/호가단위는 반영되나요?</span>}>
                <p>반영하지 않습니다. 실제 체결가는 수수료·세금·호가단위로 차이가 날 수 있습니다.</p>
              </FaqItem>

              <FaqItem q={<span className="text-[16px] font-semibold">미국/해외주식, 소수점 주식도 지원하나요?</span>}>
                <p>네. 소수점 입력을 지원하므로 미국·해외주식(소수점 주식 포함)도 계산할 수 있습니다.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
