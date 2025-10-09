// app/calculators/page.tsx
import Link from "next/link";
import meta from "./metadata";
import {
  Calculator,
  Layers3,
  Percent,
  Scissors,
  Target,
  Droplet,
  TrendingUp,
  Coins,
  CircleDollarSign,
  ArrowRight,
} from "lucide-react";

export const metadata = meta;

type Card = {
  href: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  gradient: string;
  ring: string;
};

const cards: Card[] = [
  {
    href: "/calculators/average",
    title: "주식 평단가 계산기",
    desc: "여러 번 매수의 평균 단가/수익률",
    Icon: Layers3,
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    ring: "ring-sky-300",
  },
  {
    href: "/calculators/compound",
    title: "복리 계산기",
    desc: "원금·이율·기간의 복리 성장",
    Icon: Calculator,
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ring: "ring-emerald-300",
  },
  {
    href: "/calculators/fee",
    title: "수수료 계산기",
    desc: "매수·매도 수수료/세금 추정",
    Icon: Percent,
    gradient: "from-fuchsia-500 via-purple-500 to-pink-500",
    ring: "ring-fuchsia-300",
  },
  {
    href: "/calculators/water",
    title: "물타기 계산기",
    desc: "추가 매수로 평단 변화",
    Icon: Droplet,
    gradient: "from-cyan-500 via-sky-500 to-blue-500",
    ring: "ring-cyan-300",
  },
  {
    href: "/calculators/yield",
    title: "수익률 계산기",
    desc: "매수·매도 가격 기반 수익률",
    Icon: TrendingUp,
    gradient: "from-lime-500 via-green-500 to-emerald-500",
    ring: "ring-lime-300",
  },
  {
    href: "/calculators/exchange",
    title: "환율 계산기",
    desc: "간편하게 통화 변환을 할 수 있는 환율 계산기",
    Icon: Coins,
    gradient: "from-violet-500 via-indigo-500 to-blue-500",
    ring: "ring-violet-300",
  },
  {
    href: "/calculators/tax",
    title: "양도소득세 계산기",
    desc: "국내·해외 양도차익 세금 계산",
    Icon: CircleDollarSign,
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
    ring: "ring-purple-300",
  },
  {
    href: "/calculators/losscut",
    title: "손절가 계산기",
    desc: "허용 손실률 기준 손절 가격",
    Icon: Scissors,
    gradient: "from-rose-500 via-red-500 to-orange-500",
    ring: "ring-rose-300",
  },
  {
    href: "/calculators/target",
    title: "목표수익률 계산기",
    desc: "목표 수익률 달성 주가/수익액",
    Icon: Target,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    ring: "ring-amber-300",
  },
];

export default function CalculatorsIndexPage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* ===== 상단 히어로 (사이트 톤 통일) ===== */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_300px_at_80%_20%,rgba(99,102,241,0.25),transparent_60%)]"
          />
          <div className="relative px-6 py-6 md:px-10 md:py-8 text-center">
            <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight">
              🧮 투자 계산기
            </h1>
            <p className="mt-2 mx-auto max-w-2xl text-[15px] md:text-[16px] text-white/90 leading-snug">
              <span className="font-semibold text-white">주식·환율·세금</span>까지 한 번에.
              필요한 값만 입력하면 즉시 결과를 확인할 수 있습니다.
            </p>
            {/* 서브 배지 */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs md:text-sm text-white/90">
                정확한 계산
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs md:text-sm text-white/90">
                빠르고 간편
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs md:text-sm text-white/90">
                실전 투자에 바로 적용
              </span>
            </div>
          </div>
        </section>

        {/* ===== 카드 그리드 (라이트 카드로 대비) ===== */}
        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, desc, Icon, gradient, ring }) => (
            <Link
              key={href}
              href={href}
              className={[
                "group relative overflow-hidden rounded-2xl bg-white border border-gray-100",
                "shadow-sm hover:shadow-xl transition",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500", ring,
              ].join(" ")}
            >
              {/* 상단 그라데이션 라인 */}
              <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "shrink-0 rounded-xl p-2.5 text-white shadow-sm",
                      "bg-gradient-to-br", gradient,
                      "transition-transform group-hover:scale-105",
                    ].join(" ")}
                    aria-hidden
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-[16px] md:text-[17px] font-semibold text-gray-900">
                    {title}
                  </h2>
                </div>

                <p className="mt-2 text-sm text-gray-600">{desc}</p>

                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600">
                  이동하기
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* 카드 하이라이트 */}
              <div
                className={[
                  "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  "bg-[radial-gradient(600px_circle_at_var(--x)_var(--y),rgba(59,130,246,0.06),transparent_40%)]",
                ].join(" ")}
              />
            </Link>
          ))}
        </section>

        {/* (옵션) 계산기 → 차트게임 크로스 링크 배너 */}
        {/* 필요 없으면 이 섹션 삭제해도 됨 */}
        <section className="mt-8">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-600 text-white text-center shadow-lg px-6 py-5">
            <p className="text-[15px] md:text-[16px] font-semibold">
              
              <span className="font-extrabold">주식 차트게임</span>에서{" "}
              실전처럼 매수·매도로 직접 검증해보세요!
            </p>
            <a
              href={`/game?t=${Date.now()}`}
              className="inline-block mt-3 rounded-full bg-white text-indigo-700 font-semibold py-2 px-5 shadow-sm hover:bg-gray-100 transition"
            >
              🚀 차트게임으로 연습 & 랭킹 도전하기 →
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
