"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ArrowLeftRight } from "lucide-react";

/* ---------- 유틸 ---------- */
function cleanNumber(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}
function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = (intPart ? Number(intPart) : 0).toLocaleString("ko-KR");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}
function formatMoney(n: number, currency?: string) {
  // 통화코드가 있으면 국제 통화 포맷, 없으면 일반 숫자 포맷
  try {
    if (currency) {
      return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency,
        maximumFractionDigits: 6,
      }).format(n);
    }
  } catch {}
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 6 });
}

/* ---------- FAQ 아코디언 ---------- */
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
        <span className="text-[16px] font-semibold text-gray-900">{"Q. "}{q}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`px-4 pb-4 text-gray-700 text-[15px] ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 통화 목록 ---------- */
const CURRENCIES = [
  { code: "USD", label: "미국 달러" },
  { code: "KRW", label: "대한민국 원" },
  { code: "EUR", label: "유로" },
  { code: "JPY", label: "일본 엔" },
  { code: "CNY", label: "중국 위안" },
  { code: "GBP", label: "영국 파운드" },
  { code: "AUD", label: "호주 달러" },
  { code: "CAD", label: "캐나다 달러" },
  { code: "SGD", label: "싱가포르 달러" },
  { code: "THB", label: "태국 바트" },
  { code: "PHP", label: "필리핀 페소" },
  { code: "VND", label: "베트남 동" },
  { code: "IDR", label: "인도네시아 루피아" },
  { code: "HKD", label: "홍콩 달러" },
  { code: "TWD", label: "대만 달러" },
  { code: "MYR", label: "말레이시아 링깃" },
  { code: "NZD", label: "뉴질랜드 달러" },
  { code: "INR", label: "인도 루피" },
  { code: "CHF", label: "스위스 프랑" },
  { code: "MXN", label: "멕시코 페소" },
  { code: "BRL", label: "브라질 헤알" },
  { code: "TRY", label: "터키 리라" },
  { code: "ZAR", label: "남아프리카 랜드" },
  { code: "SEK", label: "스웨덴 크로나" },
  { code: "NOK", label: "노르웨이 크로네" },
  { code: "PLN", label: "폴란드 즈워티" },
  { code: "CZK", label: "체코 코루나" },
  { code: "HUF", label: "헝가리 포린트" },
  { code: "ILS", label: "이스라엘 셰켈" },
  { code: "AED", label: "아랍에미리트 디르함" },
];

/* ---------- 페이지 ---------- */
export default function ExchangeCalculatorPage() {
  // 입력값
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("KRW");

  // 결과/상태
  const [converted, setConverted] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [error, setError] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);

  // 즐겨찾는 페어 (브라우저 저장)
  const favKey = "fx_favs_v1";
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(favKey) || "[]");
      if (Array.isArray(saved)) setFavs(saved.slice(0, 5));
    } catch {}
  }, []);

  const pair = useMemo(() => `${from}/${to}`, [from, to]);

  const addFav = () => {
    try {
      const next = [pair, ...favs.filter((p) => p !== pair)].slice(0, 5);
      setFavs(next);
      localStorage.setItem(favKey, JSON.stringify(next));
    } catch {}
  };

  const applyFav = (p: string) => {
    const [f, t] = p.split("/");
    if (f && t) {
      setFrom(f);
      setTo(t);
      setConverted(null);
      setRate(null);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setConverted(null);
    setRate(null);
  };

  const canCalc = () => {
    const amt = cleanNumber(amount);
    return amt > 0 && from && to && from !== to;
  };

  const handleConvert = async () => {
    setError("");
    setConverted(null);
    setRate(null);

    const amt = cleanNumber(amount);
    if (!(amt > 0)) {
      setError("금액을 올바르게 입력하세요.");
      return;
    }
    if (from === to) {
      setError("서로 다른 통화를 선택하세요.");
      return;
    }

    try {
      const res = await fetch(`/api/exchange?from=${from}&to=${to}&amount=${amt}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || typeof data?.result !== "number") {
        throw new Error("API 응답이 올바르지 않습니다.");
      }

      // 환산값
      setConverted(data.result);

      // 단위 환율도 표시 (1 from = ? to)
      const unitRes = await fetch(`/api/exchange?from=${from}&to=${to}&amount=1`, { cache: "no-store" });
      const unitData = await unitRes.json();
      if (typeof unitData?.result === "number") {
        setRate(unitData.result);
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } catch (e) {
      setError("환율 정보를 불러오는 데 문제가 발생했습니다.");
    }
  };

  const resetAll = () => {
    setAmount("");
    setConverted(null);
    setRate(null);
    setError("");
  };

  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
<header className="mb-6 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
    환율 계산기
  </h1>
  <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2">
    <p className="text-gray-900 text-[17px] font-semibold leading-snug">
      📌 <b>실시간 환율로 간편하게 계산할 수 있는 환율 계산기입니다. 통화 선택 + 금액 입력</b>만으로 <b>KRW, USD, EUR</b> 등 여러 나라 통화를 빠르고 정확하게 환산해 보세요.
    </p>
    <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
      <li>해외여행, 송금, 외화 투자 시 활용할 수 있습니다.</li>
      <li><b>전날 환율</b> 기준으로 계산하여, 매일 최신 정보로 업데이트됩니다.</li>
      <li>실제 환전 시에는 <b>은행 스프레드·수수료</b>가 적용되므로 참고용으로만 활용하세요.</li>
    </ul>
  </div>
</header>


        {/* 입력 카드 */}
        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
          <div>
            <label className="block mb-1 font-semibold text-gray-800">금액</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(formatNumberString(e.target.value))}
              placeholder="예: 1,000.50"
              className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="block mb-1 font-semibold text-gray-800">보유 통화</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swap}
                className="mt-6 sm:mt-0 h-10 w-10 flex items-center justify-center rounded-full border hover:bg-gray-100"
                title="통화 바꾸기"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-gray-800">변환 통화</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleConvert}
              disabled={!canCalc()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              환율 계산하기
            </button>
            <button
              onClick={resetAll}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={addFav}
              className="w-full rounded-md bg-gray-50 px-4 py-2 font-bold text-gray-800 border transition hover:bg-gray-100"
              title="현재 변환통화를 즐겨찾기에 저장"
            >
              ⭐현재 통화 즐겨찾기
            </button>
          </div>

          {/* 즐겨찾기 페어 */}
          {favs.length > 0 && (
            <div className="text-[14px] text-gray-700">
              <div className="font-semibold mb-1">즐겨찾기</div>
              <div className="flex flex-wrap gap-2">
                {favs.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyFav(p)}
                    className="px-3 py-1 rounded-full border hover:bg-gray-100"
                    title={`${p} 선택`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* 결과 */}
        <section ref={resultRef}>
          {(converted !== null || rate !== null) && (
            <div className="mt-6 rounded-2xl bg-white shadow p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">결과</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
                {converted !== null && (
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <span className="text-gray-600">변환 금액</span>
                    <span className="font-semibold text-blue-600">
                      {formatMoney(converted, to)}
                    </span>
                  </div>
                )}
                {rate !== null && (
                  <>
                    <div className="flex items-center justify-between rounded-xl border p-3">
                      <span className="text-gray-600">환율 (1 {from} → {to})</span>
                      <span className="font-semibold">
                        {formatMoney(rate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border p-3">
                      <span className="text-gray-600">역환율 (1 {to} → {from})</span>
                      <span className="font-semibold">
                        {rate > 0 ? formatMoney(1 / rate) : "-"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            
            </div>
          )}
        </section>

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


      {/* 설명/공식/FAQ */}
<section className="mt-10 space-y-6">
  {/* 사용방법 */}
  <div className="rounded-2xl bg-white shadow p-6">
    <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
      계산기 사용방법
    </h2>
    <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-700">
      <li><b>금액</b>과 <b>보유/변환 통화</b>를 선택합니다.</li>
      <li><b>환율 계산하기</b> 버튼을 누르면 변환 금액과 환율(단위·역환율)이 표시됩니다.</li>
      <li>자주 쓰는 통화변환은 <b>현재 페어 즐겨찾기</b>를 눌러 저장해두세요.</li>
    </ol>
  </div>

  {/* 환율 계산 공식 */}
  <div className="rounded-2xl bg-white shadow p-6">
    <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
      환율 계산 공식
    </h2>
    <div className="text-[15px] text-gray-700 space-y-3">
      <p><b>매매기준율 이용</b>: 교환할 금액 = 기준 금액 × 환율</p>
      <p className="ml-2 text-gray-600">예) 100달러 × 1,200원/달러 = <b>120,000원</b></p>

      <p><b>현찰 환전율 이용</b>: 교환할 금액 = 기준 금액 × 현찰 환전율</p>
      <p className="ml-2 text-gray-600">예) 100달러 × 1,220원/달러 = <b>122,000원</b></p>

      <p className="text-sm text-gray-500">
        ※ 현찰 환전율은 매매기준율에 은행 스프레드(마진)가 더해진 값입니다.  
        실제 환전 시 수수료·우대율 등에 따라 금액이 달라질 수 있습니다.
      </p>
    </div>
  </div>

  {/* FAQ */}
  <div className="rounded-2xl bg-white shadow p-6">
    <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3 mb-3">
      자주 묻는 질문 (FAQ)
    </h2>
    <div className="space-y-2">
      <FaqItem q="전일 환율이라는데 얼마나 정확한가요?">
        <p>공식 제공처의 <b>전일 종가 기준</b> 환율입니다. 장중 실시간 환율과는 차이가 있을 수 있어요.</p>
      </FaqItem>
      <FaqItem q="왜 실제 환전 금액과 다르게 나오나요?">
        <p>은행/증권사는 매매 기준율에 <b>스프레드(마진)</b>와 각종 <b>수수료</b>를 더해 적용합니다. 본 계산기는 해당 비용을 포함하지 않습니다.</p>
      </FaqItem>
      <FaqItem q="해외 카드 결제 시 적용되는 환율은?">
        <p>카드사에서 매입하는 시점의 환율과 <b>해외 이용 수수료</b>가 함께 적용됩니다. 승인일 환율과 실제 결제일 환율이 달라질 수 있습니다.</p>
      </FaqItem>
      <FaqItem q="현찰·송금·전신환 환율 차이는?">
        <p>현찰 환율은 지폐 교환에 적용되는 환율로 스프레드가 가장 큽니다. 송금 환율은 계좌 이체 시, 전신환 매매기준율은 기준 환율로 사용됩니다.</p>
      </FaqItem>
    </div>
  </div>
</section>


      </div>
    </main>
  );
}
