"use client";
import { useState, useEffect } from "react";

type Props = {
  type: "buy" | "sell";
  currentPrice: number;
  maxShares: number;
  onClose: () => void;
  onSubmit: (shares: number) => void;
};

export default function OrderModal({ type, currentPrice, maxShares, onClose, onSubmit }: Props) {
  const [shares, setShares] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
  const roundedPrice = Math.round(currentPrice);
  setTotalPrice(shares * roundedPrice);
}, [shares, currentPrice]);

  const setPercent = (pct: number) => {
    setShares(Math.floor(maxShares * pct));
  };

  const handleSubmit = () => {
    if (shares > 0) {
      onSubmit(shares);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[320px] shadow-lg">
        <h2 className={`text-lg font-bold mb-4 ${type === "buy" ? "text-red-500" : "text-blue-500"}`}>
          {type === "buy" ? "매수 주문" : "매도 주문"}
        </h2>

        <div className="flex justify-between text-sm mb-2">
          <span>주문수량</span>
          <span>주문가능 {maxShares.toLocaleString()} 주</span>
        </div>
        <input
          type="number"
          min={0}
          max={maxShares}
          value={shares}
          onChange={(e) => setShares(Number(e.target.value))}
          className="w-full border rounded px-2 py-1 text-right"
        />

        <div className="grid grid-cols-4 gap-2 mt-2">
          {[0.1, 0.25, 0.5, 1].map((p) => (
            <button
              key={p}
              onClick={() => setPercent(p)}
              className="bg-gray-100 hover:bg-gray-200 rounded py-1 text-sm"
            >
              {p * 100}%
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-between">
          <span>주문단가</span>
          <span>{Math.round(currentPrice).toLocaleString()} 원</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>총 주문금액</span>
          <span>{totalPrice > 0 ? totalPrice.toLocaleString() + " 원" : "- 원"}</span>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 rounded py-2">
            취소
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 text-white rounded py-2 ${type === "buy" ? "bg-red-500" : "bg-blue-500"}`}
          >
            {type === "buy" ? "매수" : "매도"}
          </button>
        </div>
      </div>
    </div>
  );
}
