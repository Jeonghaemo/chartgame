// app/calculators/compound/page.client.tsx
"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

function cleanNumber(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = Number(intPart).toLocaleString("ko-KR");
  return decimalPart !== undefined
    ? `${formattedInt}.${decimalPart}`
    : formattedInt;
}

function formatMoney(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function formatPct(n: number) {
  return `${n.toFixed(2)}%`;
}

/** FAQ 아코디언 */
function FaqItem({ q, children }: { q: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[16px] font-semibold text-gray-900">
          {"Q. "}{q}
        </span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`px-4 pb-4 text-gray-700 text-[15px] ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

type ScheduleRow = { period: number; principal: number; interest: number; total: number };

export default function CompoundCalculatorPage() {
  const [activeTab, setActiveTab] = useState<"basic" | "saving">("basic");
  const [principal, setPrincipal] = useState("");
  const [monthlyPrincipal, setMonthlyPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [periodType, setPeriodType] = useState<"year" | "month">("year");
  const [periodValue, setPeriodValue] = useState("");
  const [compoundType, setCompoundType] = useState("annual");

  const [result, setResult] = useState<{
    total: number;
    interest: number;
    principal: number;
    schedule: ScheduleRow[];
    rateOfReturn: number;
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onChange = (setter: (v: string) => void) => (v: string) =>
    setter(formatNumberString(v));

  const getCompoundFrequency = (type: string) => {
    switch (type) {
      case "semiannual": return 2;
      case "quarterly": return 4;
      case "monthly": return 12;
      case "daily": return 365;
      default: return 1;
    }
  };

  const calculate = () => {
    const P = cleanNumber(principal);
    const MP = cleanNumber(monthlyPrincipal);
    const r = parseFloat(rate) / 100 || 0;
    const period = cleanNumber(periodValue);
    const n = getCompoundFrequency(compoundType);
    const t = periodType === "month" ? period / 12 : period;
    const totalPeriods = activeTab === "basic" ? Math.round(n * t) : Math.round(t * 12);

    let balance = P;
    let schedule: ScheduleRow[] = [];

    for (let i = 1; i <= totalPeriods; i++) {
      if (activeTab === "saving") {
        balance += MP;
      }
      const interest = balance * (r / (activeTab === "saving" ? 12 : n));
      balance += interest;

      schedule.push({
        period: i,
        principal: balance - interest,
        interest,
        total: balance,
      });
    }

    const futureValue = balance;
    const totalPrincipal = activeTab === "saving" ? P + MP * totalPeriods : P;
    const interestEarned = futureValue - totalPrincipal;
    const rateOfReturn = totalPrincipal > 0 ? (interestEarned / totalPrincipal) * 100 : 0;

    setResult({
      total: futureValue,
      interest: interestEarned,
      principal: totalPrincipal,
      schedule,
      rateOfReturn,
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const resetAll = () => {
    setPrincipal("");
    setMonthlyPrincipal("");
    setRate("");
    setPeriodValue("");
    setResult(null);
  };

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
        <header className="mb-6 text-center">
          <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
            복리 계산기
          </h1>
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 text-left px-6 py-5 space-y-3">
            <p className="text-gray-900 text-[17px] font-semibold">
              📌 원금과 이자율, 기간을 입력해 <b>기본 복리·적립식 복리</b>를 계산합니다.
            </p>
            <ul className="list-disc list-inside text-[16px] text-gray-800">
              <li>연·월·일 복리 등 다양한 주기를 선택할 수 있습니다.</li>
              <li>적립식 투자 시 매월 일정 금액 추가 납입도 계산됩니다.</li>
              <li>장기 투자 수익률, 은퇴 자산 시뮬레이션 등에 활용하세요.</li>
            </ul>
          </div>
        </header>

        {/* 입력 카드 */}
        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
          {/* 탭 버튼 개선 */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("basic")}
              className={`flex-1 py-3 text-lg font-bold rounded-2xl shadow transition-all 
              ${activeTab === "basic" ? "bg-blue-600 text-white scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🧮 기본 복리
            </button>
            <button
              onClick={() => setActiveTab("saving")}
              className={`flex-1 py-3 text-lg font-bold rounded-2xl shadow transition-all 
              ${activeTab === "saving" ? "bg-green-600 text-white scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              💰 적립식 복리
            </button>
          </div>

          {/* 입력 필드 */}
          <div>
            <label className="block mb-1 font-semibold text-gray-800">초기 금액 (원)</label>
            <input
              type="text"
              inputMode="decimal"
              value={principal}
              onChange={(e) => onChange(setPrincipal)(e.target.value)}
              placeholder="예: 1,000,000"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          {activeTab === "saving" && (
            <div>
              <label className="block mb-1 font-semibold text-gray-800">매월 적립 금액 (원)</label>
              <input
                type="text"
                inputMode="decimal"
                value={monthlyPrincipal}
                onChange={(e) => onChange(setMonthlyPrincipal)(e.target.value)}
                placeholder="예: 100,000"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input type="radio" value="year" checked={periodType === "year"} onChange={() => setPeriodType("year")} /> <span>년</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" value="month" checked={periodType === "month"} onChange={() => setPeriodType("month")} /> <span>개월</span>
            </label>
          </div>

          <input
            type="text"
            inputMode="decimal"
            value={periodValue}
            onChange={(e) => onChange(setPeriodValue)(e.target.value)}
            placeholder={periodType === "year" ? "예: 3" : "예: 36"}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
          />

          <div>
            <label className="block mb-1 font-semibold text-gray-800">이자율 (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="예: 5.25"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-800">복리 방식</label>
            <select
              value={compoundType}
              onChange={(e) => setCompoundType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="annual">연복리</option>
              <option value="semiannual">반기복리</option>
              <option value="quarterly">분기복리</option>
              <option value="monthly">월복리</option>
              <option value="daily">일복리</option>
            </select>
          </div>

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
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                결과
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 수익</span>
                  <span className="font-semibold text-red-600">
                    ₩{formatMoney(result.interest)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">최종 금액</span>
                  <span className="font-semibold text-blue-600">
                    ₩{formatMoney(result.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-gray-600">총 투자금</span>
                  <span className="font-semibold">
                    ₩{formatMoney(result.principal)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
                  <span className="text-gray-600">수익률</span>
                  <span className="font-semibold text-red-600">
                    {formatPct(result.rateOfReturn)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 설명 / 공식 / FAQ */}
        <section className="mt-10 space-y-6">
          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              계산기 사용방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
              <li>초기 투자금, 투자 기간(년/월), 연이율(%)을 입력하세요.</li>
              <li>복리 주기(연, 반기, 분기, 월, 일)를 선택하세요.</li>
              <li>적립식 탭을 선택하면 매월 납입 금액을 추가로 입력할 수 있습니다.</li>
              <li>계산하기 버튼을 누르면 최종 금액, 총 수익, 수익률을 확인할 수 있습니다.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ※ 세금 및 금융수수료는 반영되지 않은 단순 계산입니다.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              복리 계산 공식
            </h2>
            <p className="text-[15px] text-gray-700">
              <b>기본 복리</b>: <b>원금 × (1 + 이자율)<sup>기간×횟수</sup></b>
            </p>
            <p className="text-[15px] text-gray-700 mt-2">
              <b>적립식 복리</b>: 매월 납입금도 동일한 이자율로 복리 계산하여 합산
            </p>
            <div className="mt-3 text-sm text-gray-600">
              예: 원금 100만원, 연 10%, 3년 → 100만원 × (1+0.1)<sup>3</sup> = 1,331,000원
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
              자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-2">
              <FaqItem q="복리는 단리와 뭐가 다른가요?">
                <p>단리는 원금에만 이자가 붙고, 복리는 이자에도 이자가 붙습니다. 장기 투자일수록 차이가 커집니다.</p>
              </FaqItem>
              <FaqItem q="월복리와 연복리는 어떤 차이가 있나요?">
                <p>월복리는 매달 이자가 붙기 때문에 연복리보다 최종 금액이 더 큽니다.</p>
              </FaqItem>
              <FaqItem q="적립식 복리는 어떻게 계산되나요?">
                <p>매월 납입금이 다음 달부터 이자 계산에 포함됩니다. 따라서 기간이 길수록 효과가 커집니다.</p>
              </FaqItem>
              <FaqItem q="복리 효과는 얼마나 걸려야 체감할 수 있나요?">
                <p>보통 3~5년 이상 장기 투자 시 효과가 두드러지게 나타납니다.</p>
              </FaqItem>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
