"use client";

import { useEffect, useMemo, useState } from "react";
import ExchangeResult from "@/components/ExchangeResult";


const currencies = [
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
  { code: "AED", label: "아랍에미리트 디르함" },
  { code: "ZAR", label: "남아프리카 랜드" },
  { code: "SEK", label: "스웨덴 크로나" },
  { code: "NOK", label: "노르웨이 크로네" },
  { code: "PLN", label: "폴란드 즈워티" },
  { code: "CZK", label: "체코 코루나" },
  { code: "HUF", label: "헝가리 포린트" },
  { code: "ILS", label: "이스라엘 셰켈" },
  { code: "DKK", label: "덴마크 크로네" },
  { code: "SAR", label: "사우디 리얄" },
  // 필요 시 계속 추가 가능
];

function formatNumberString(s: string) {
  const raw = s.replace(/[^0-9.]/g, "");
  if (!raw) return "";
  const [i, d] = raw.split(".");
  const fi = (i ? Number(i) : 0).toLocaleString("ko-KR");
  return d !== undefined ? `${fi}.${d}` : fi;
}

export default function ExchangeForm() {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KRW");

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [result, setResult] = useState<null | {
    result: number;
    rate: number;
    base: string;
    date: string;
  }>(null);

  // 즐겨찾기 페어 (로컬 저장)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("fx_favorites") || "[]");
    } catch { return []; }
  });

  // 초기 복원 (최근 사용값)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const last = JSON.parse(localStorage.getItem("fx_last") || "{}");
      if (last.amount) setAmount(last.amount);
      if (last.from) setFromCurrency(last.from);
      if (last.to) setToCurrency(last.to);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fx_favorites", JSON.stringify(favorites));
      localStorage.setItem("fx_last", JSON.stringify({
        amount, from: fromCurrency, to: toCurrency
      }));
    }
  }, [favorites, amount, fromCurrency, toCurrency]);

  const swap = () => {
    setResult(null);
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const toggleFavorite = () => {
    const key = `${fromCurrency}-${toCurrency}`;
    setFavorites(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isFavorite = useMemo(
    () => favorites.includes(`${fromCurrency}-${toCurrency}`),
    [favorites, fromCurrency, toCurrency]
  );

  const handleConvert = async () => {
    try {
      setApiError("");
      setResult(null);
      setLoading(true);

      const value = parseFloat((amount || "").replace(/,/g, ""));
      if (!Number.isFinite(value)) {
        setApiError("숫자를 정확히 입력해주세요.");
        return;
      }

      const res = await fetch(
        `/api/exchange?from=${fromCurrency}&to=${toCurrency}&amount=${value}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "환율 정보를 불러오는 데 문제가 발생했습니다.");
      }
      if (typeof data.result !== "number" || typeof data.rate !== "number") {
        throw new Error("API 응답이 유효하지 않습니다.");
      }

      setResult({
        result: data.result,
        rate: data.rate,
        base: data.base,
        date: data.date,
      });
    } catch (err: any) {
      setApiError(err?.message || "환율 정보를 불러오는 데 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(formatNumberString(e.target.value))}
        placeholder="금액 입력 (소수점 가능)"
        className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        inputMode="decimal"
      />

      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <select
          value={fromCurrency}
          onChange={(e) => { setFromCurrency(e.target.value); setResult(null); }}
          className="flex-1 border border-gray-300 rounded px-4 py-2"
        >
          {currencies.map((cur) => (
            <option key={cur.code} value={cur.code}>
              {cur.label} ({cur.code})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={swap}
            className="px-3 py-2 border rounded hover:bg-gray-100 text-lg"
            title="통화 바꾸기"
            aria-label="통화 바꾸기"
          >
            ↔
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            className={`px-3 py-2 border rounded text-sm ${isFavorite ? "bg-yellow-300" : "hover:bg-gray-100"}`}
            title="즐겨찾기"
            aria-pressed={isFavorite}
          >
            ★
          </button>
        </div>

        <select
          value={toCurrency}
          onChange={(e) => { setToCurrency(e.target.value); setResult(null); }}
          className="flex-1 border border-gray-300 rounded px-4 py-2"
        >
          {currencies.map((cur) => (
            <option key={cur.code} value={cur.code}>
              {cur.label} ({cur.code})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleConvert}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-base font-semibold disabled:opacity-50"
      >
        {loading ? "계산 중..." : "환율 계산하기"}
      </button>

      {apiError && <div className="text-red-600">{apiError}</div>}

      {result && (
        <div className="space-y-3">
          <ExchangeResult
            result={result.result}
            toCurrency={toCurrency}
            rate={result.rate}
            fromCurrency={fromCurrency}
            date={result.date}
          />
          
        </div>
      )}

      {/* 즐겨찾기 빠른 선택 */}
      {favorites.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">즐겨찾는 페어</div>
          <div className="flex flex-wrap gap-2">
            {favorites.map(key => {
              const [f, t] = key.split("-");
              return (
                <button
                  key={key}
                  onClick={() => { setFromCurrency(f); setToCurrency(t); setResult(null); }}
                  className="px-3 py-1 rounded border hover:bg-gray-100 text-sm"
                  title={`${f}→${t}`}
                >
                  {f}→{t}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}