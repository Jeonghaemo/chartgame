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
];

export default function CalculatorsIndexPage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* 헤더 */}
<header className="mb-8 text-center">
  <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
    투자 계산기
  </h1>

  {/* 설명 박스 */}
  <div className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white/80 backdrop-blur border border-gray-200 shadow-sm text-left px-6 py-6">
    <p className="text-gray-900 text-lg md:text-xl font-medium leading-snug">
      <b className="text-blue-700">주식·환율·세금까지 한 번에 계산하세요.</b><br />
      매수가·수수료·세금·환율 등 간단히 입력하면 즉시 결과를 확인할 수 있습니다.
    </p>
  </div>
</header>


        {/* 카드 그리드 */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, desc, Icon, gradient, ring }) => (
            <Link
              key={href}
              href={href}
              className={[
                "group relative overflow-hidden rounded-2xl bg-white/90 border border-gray-100",
                "shadow-sm hover:shadow-xl transition",
                "focus:outline-none focus:ring-2", ring,
              ].join(" ")}
            >
              {/* 카드 상단 그라데이션 라인 */}
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
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                </div>

                <p className="mt-2 text-sm text-gray-600">{desc}</p>

                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600">
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
      </div>
    </main>
  );
}
