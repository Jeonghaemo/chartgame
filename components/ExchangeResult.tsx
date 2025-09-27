"use client";

interface Props {
  result: number;
  toCurrency: string;
  rate: number;
  fromCurrency: string;
  date?: string;
}

// Intl 통화 포맷이 지원하지 않는 통화 대비 폴백
function safeCurrencyFormat(value: number, code: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // 폴백: 단순 숫자 + 코드
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`;
  }
}

export default function ExchangeResult({ result, toCurrency, rate, fromCurrency, date }: Props) {
  const formatted = safeCurrencyFormat(result, toCurrency);

  return (
    <div className="rounded-2xl bg-white shadow p-5 space-y-2">
      <div className="text-lg font-bold text-gray-900">환율 결과</div>
      <div className="text-[15px] text-gray-800">
        <div className="flex items-center justify-between rounded-xl border p-3">
          <span className="text-gray-600">적용 환율</span>
          <span className="font-semibold text-blue-600">
            1 {fromCurrency} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border p-3 mt-2">
          <span className="text-gray-600">변환 금액</span>
          <span className="font-semibold text-red-600">{formatted}</span>
        </div>
        {date && (
          <div className="flex items-center justify-between rounded-xl border p-3 mt-2">
            <span className="text-gray-600">데이터 기준일</span>
            <span className="font-semibold">{date}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          ※ 실제 환전 시에는 <b>은행 스프레드·수수료</b>가 붙으므로 계산 결과와 차이가 날 수 있습니다.
        </p>
      </div>
    </div>
  );
}
