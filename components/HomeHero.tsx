"use client";

import { motion } from "framer-motion";
import { LineChart, Trophy } from "lucide-react";

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
      {/* 은은한 라디얼 배경 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_300px_at_80%_20%,rgba(99,102,241,0.25),transparent_60%)]"
      />

      {/* ✅ 여백 축소: py-6 / md:py-8 */}
      <div className="relative px-6 py-6 md:px-10 md:py-8 text-center">
        {/* 타이틀 */}
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[30px] md:text-[38px] font-extrabold tracking-tight mb-3"
        >
          🚀 주식 차트게임
        </motion.h1>

        {/* 메인 설명 문장 */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="mx-auto max-w-2xl text-[17px] md:text-[19px] text-slate-100/95 leading-snug font-medium"
        >
          실제 과거 차트로 즐기는{" "}
          <span className="font-semibold text-white">모의 투자 게임</span>.<br className="hidden sm:block" />
          최고의 투자자는 누구일까? <span aria-hidden>🏆</span>
        </motion.p>
      
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-2 text-[16px] md:text-[18px] text-slate-200/90"
        >
          나의 계급은{" "}
          <span className="font-semibold text-yellow-300">🐣 주린이</span>?{" "}
          아니면 <span className="font-semibold text-yellow-300">👑 졸업자</span>?
        </motion.p>

        {/* 뱃지 (맨 아래) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-5 flex items-center justify-center gap-2 flex-wrap"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm md:text-base text-slate-100/90">
            <LineChart className="h-4 w-4" /> 실제 차트 연습
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm md:text-base text-slate-100/90">
            <Trophy className="h-4 w-4" /> 랭킹 경쟁
          </span>
        </motion.div>
      </div>
    </section>
  );
}
