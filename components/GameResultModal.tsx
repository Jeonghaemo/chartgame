"use client"

import React from "react"

type Props = {
  isOpen: boolean
  onClose: () => void
  result: {
    startCapital: number
    endCapital: number
    profit: number
    profitRate: number
    tax: number
    tradeCount: number
    turnCount: number
    heartsLeft: number
    rank?: number | null
    prevRank?: number | null
    symbol?: string
  }
}

export default function GameResultModal({ isOpen, onClose, result }: Props) {
  if (!isOpen) return null

  const formatNumber = (n: number) => n.toLocaleString()

  // 순위 변동 계산
  const rankDiff =
    result.rank != null && result.prevRank != null
      ? result.prevRank - result.rank
      : 0

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-[380px] animate-fadeIn">
        
        {/* 타이틀 */}
        <h2 className="text-xl font-bold text-center mb-4">게임 종료 결과</h2>
{result.symbol && (
          <div className="mb-3 flex items-center justify-center">
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              {result.symbol}
            </span>
          </div>
        )}
        {/* 자산 & 순위 */}
        <div className="mb-4">
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2">
            <div className="text-center">
              <div className="text-gray-500 text-sm">초기자산</div>
              <div className="text-lg font-bold">{formatNumber(result.startCapital)} 원</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center">
              <div className="text-gray-500 text-sm">최종자산</div>
              <div className={`text-lg font-bold ${result.profit >= 0 ? "text-red-500" : "text-blue-500"}`}>
                {formatNumber(result.endCapital)} 원
              </div>
            </div>
          </div>

          {/* 순위 정보 */}
          {result.rank != null && (
            <div className="bg-white border rounded-lg p-3 flex justify-between items-center">
              <span className="text-gray-600 font-medium">현재 순위</span>
              <span className="text-lg font-bold flex items-center gap-1">
                {result.rank}위
                {rankDiff > 0 && (
                  <span className="text-green-600 text-sm">▲ {rankDiff}</span>
                )}
                {rankDiff < 0 && (
                  <span className="text-red-600 text-sm">▼ {Math.abs(rankDiff)}</span>
                )}
                {rankDiff === 0 && (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* 수익금 / 수익률 */}
        <div className="flex justify-between mb-2">
          <span>수익금</span>
          <span className={result.profit >= 0 ? "text-red-500" : "text-blue-500"}>
            {result.profit >= 0 ? "+" : ""}{formatNumber(result.profit)} 원
          </span>
        </div>
        <div className="flex justify-between mb-4">
          <span>수익률</span>
          <span className={result.profitRate >= 0 ? "text-red-500" : "text-blue-500"}>
            {result.profitRate >= 0 ? "+" : ""}{result.profitRate.toFixed(2)} %
          </span>
        </div>

        {/* 수수료 / 세금 */}
        <div className="flex justify-between mb-2 text-sm text-gray-600">
          <span>수수료 및 세금</span>
          <span>{formatNumber(result.tax)} 원</span>
        </div>

        {/* 거래 / 턴 */}
        <div className="flex justify-between mb-2 text-sm text-gray-600">
          <span>총 거래 횟수</span>
          <span>{result.tradeCount} 회</span>
        </div>
        <div className="flex justify-between mb-4 text-sm text-gray-600">
          <span>게임 턴 횟수</span>
          <span>{result.turnCount} 턴</span>
        </div>

        {/* 남은 하트 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span>남은 하트</span>
          <span className="text-red-500 font-bold">{result.heartsLeft} ❤️</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
            onClick={onClose}
          >
            메인화면
          </button>
          <button
            className="flex-1 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            onClick={() => location.reload()}
          >
            새 게임
          </button>
        </div>
      </div>
    </div>
  )
}
