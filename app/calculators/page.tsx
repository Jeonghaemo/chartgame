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
  ReceiptCent,
  ArrowRight,
} from "lucide-react";

export const metadata = meta;

type Card = {
  href: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: "인기" | "신규" | "업데이트";
};

const cards: Card[] = [
  {
    href: "/calculators/average",
    title: "주식 평단가 계산기",
    desc: "여러 번 매수의 평균 단가/수익률 계산",
    Icon: Layers3,
  },
  {
    href: "/calculators/compound",
    title: "복리 계산기",
    desc: "원금·이율·기간에 따른 복리 성장",
    Icon: Calculator,
  },
  {
    href: "/calculators/fee",
    title: "수수료 계산기",
    desc: "매수·매도 수수료/세금 반영 실수령액",
    Icon: Percent,
    badge: "인기",
  },
  {
    href: "/calculators/losscut",
    title: "손절가 계산기",
    desc: "허용 손실률 기준 손절 가격",
    Icon: Scissors,
  },
  {
    href: "/calculators/target",
    title: "목표수익률 계산기",
    desc: "목표 수익률 달성 주가/수익액",
    Icon: Target,
  },
  {
    href: "/calculators/water",
    title: "물타기 계산기",
    desc: "추가 매수 후 평단 변화/수익률",
    Icon: Droplet,
  },
  {
    href: "/calculators/yield",
    title: "수익률 계산기",
    desc: "매수·매도 가격 기반 수익률",
    Icon: TrendingUp,
  },
  {
    href: "/calculators/exchange",
    title: "환율 계산기",
    desc: "전일 환율 기준 간편 통화 변환",
    Icon: Coins,
    badge: "업데이트",
  },
  {
    href: "/calculators/tax",
    title: "양도소득세 계산기",
    desc: "국내/해외 주식 양도세 간편 산출",
    Icon: ReceiptCent,
    badge: "신규",
  },
];

export default function CalculatorsIndexPage() {
  return (
    <main className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 헤더 */}
        <header className="mb-6 text-center">
          <h1 className="inline-block bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent text-4xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
            주식 투자 계산기
          </h1>
          <div className="mt-4 rounded-xl bg-white border border-gray-200 shadow-sm text-left px-6 py-5 space-y-2 mx-auto max-w-3xl">
            <p className="text-gray-900 text-[17px] font-semibold leading-snug">
              📌 주식·환율 계산을 하나로. 총 <b>{cards.length}개</b> 계산기를 빠르고 정확하게 이용해 보세요.
            </p>
            <ul className="list-disc list-inside text-[16px] text-gray-800 space-y-1">
              <li>일관된 UI와 검증된 계산 로직으로 신뢰도 향상</li>
              <li>세부 설명·공식·FAQ 제공으로 초보도 쉽게 활용</li>
              <li>모든 결과는 참고용이며 실제 거래/신고와 차이가 있을 수 있습니다.</li>
            </ul>
          </div>
        </header>

        {/* 카드 그리드 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, desc, Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl bg-white shadow-sm hover:shadow-md transition border border-gray-200 hover:border-blue-200 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 border bg-gray-50">
                  <Icon className="w-6 h-6 text-gray-800" aria-hidden />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {badge && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          badge === "신규"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : badge === "업데이트"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                이동하기 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>

        {/* 신뢰/가이드 푸터 블록 */}
        <section className="mt-8">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-[15px] font-semibold text-gray-900">안내 및 유의사항</h3>
            <p className="mt-1 text-[14px] text-gray-600 leading-relaxed">
              본 서비스의 계산 결과는 참고용입니다. 수수료·세금·호가·환율 등의 실제 적용 방식,
              증권사/기관별 절사·반올림 규칙, 공시·정책 변경 등에 따라 결과가 달라질 수 있습니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
