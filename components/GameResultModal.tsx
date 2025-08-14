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
  }
}

export default function GameResultModal({ isOpen, onClose, result }: Props) {
  if (!isOpen) return null

  const formatNumber = (n: number) => n.toLocaleString()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-[360px]">
        {/* 자본금 변화 */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <div className="text-gray-500">초기자산</div>
            <div className="text-lg font-bold">{formatNumber(result.startCapital)} 원</div>
          </div>
          <div className="text-2xl">→</div>
          <div className="text-center">
            <div className="text-gray-500">최종자산</div>
            <div className="text-lg font-bold text-red-500">{formatNumber(result.endCapital)} 원</div>
          </div>
        </div>

        {/* 수익금 / 수익률 */}
        <div className="flex justify-between mb-2">
          <span>수익금</span>
          <span className="text-red-500">+{formatNumber(result.profit)} 원</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>수익률</span>
          <span className="text-red-500">+{result.profitRate.toFixed(2)} %</span>
        </div>

        {/* 수수료 / 세금 */}
        <div className="flex justify-between mb-2">
          <span>수수료 및 세금</span>
          <span>{formatNumber(result.tax)} 원</span>
        </div>

        {/* 거래 / 턴 */}
        <div className="flex justify-between mb-2">
          <span>총 거래 횟수</span>
          <span>{result.tradeCount} 회</span>
        </div>
        <div className="flex justify-between mb-4">
          <span>게임 턴 횟수</span>
          <span>{result.turnCount} 턴</span>
        </div>

        {/* 남은 시드 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span>남은 시드</span>
          <span className="text-red-500">{result.heartsLeft} ❤️</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-lg bg-gray-200"
            onClick={onClose}
          >
            닫기
          </button>
          <button
            className="flex-1 py-2 rounded-lg bg-red-500 text-white"
            onClick={() => location.reload()}
          >
            새 게임
          </button>
        </div>
      </div>
    </div>
  )
}
