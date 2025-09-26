import Link from "next/link";
import meta from "./metadata";
import {
  Calculator, Layers3, Percent, Scissors, Target, Droplet, TrendingUp,
} from "lucide-react";

export const metadata = meta;

const cards = [
  { href: "/calculators/average",  title: "주식 평단가 계산기", desc: "여러 번 매수의 평균 단가/수익률", Icon: Layers3 },
  { href: "/calculators/compound", title: "복리 계산기",        desc: "원금·이율·기간의 복리 성장",  Icon: Calculator },
  { href: "/calculators/fee",      title: "수수료 계산기",      desc: "매수·매도 수수료/세금 추정", Icon: Percent },
  { href: "/calculators/losscut",  title: "손절가 계산기",      desc: "허용 손실률 기준 손절 가격", Icon: Scissors },
  { href: "/calculators/target",   title: "목표수익률 계산기",  desc: "목표 수익률 달성 주가/수익액", Icon: Target },
  { href: "/calculators/water",    title: "물타기 계산기",      desc: "추가 매수로 평단 변화",      Icon: Droplet },
  { href: "/calculators/yield",    title: "수익률 계산기",      desc: "매수·매도 가격 기반 수익률", Icon: TrendingUp },
];

export default function CalculatorsIndexPage() {
  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">투자 계산기</h1>
          <p className="mt-1 text-gray-600">주식 투자에 자주 쓰는 7개 계산기를 한 곳에 모았습니다.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl bg-white shadow hover:shadow-lg transition p-5 border border-transparent hover:border-blue-200"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2 border">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{desc}</p>
              <div className="mt-4 text-sm font-medium text-blue-600 group-hover:translate-x-0.5 transition">
                이동하기 →
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
