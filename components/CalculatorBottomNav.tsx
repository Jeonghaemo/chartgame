// components/CalculatorBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Layers3,
  Calculator,
  Percent,
  Droplet,
  TrendingUp,
  Coins,
  CircleDollarSign,
  Scissors,
  Target,
} from "lucide-react";

type Item = {
  href: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  idleClass: string;
};

const items: Item[] = [
  { href: "/game", title: "차트게임", Icon: BarChart3, idleClass: "text-indigo-600" },
  { href: "/calculators/average", title: "평단가", Icon: Layers3, idleClass: "text-sky-600" },
  { href: "/calculators/compound", title: "복리", Icon: Calculator, idleClass: "text-emerald-600" },
  { href: "/calculators/fee", title: "수수료", Icon: Percent, idleClass: "text-fuchsia-600" },
  { href: "/calculators/water", title: "물타기", Icon: Droplet, idleClass: "text-cyan-600" },
  { href: "/calculators/yield", title: "수익률", Icon: TrendingUp, idleClass: "text-lime-600" },
  { href: "/calculators/exchange", title: "환율", Icon: Coins, idleClass: "text-violet-600" },
  { href: "/calculators/tax", title: "양도세", Icon: CircleDollarSign, idleClass: "text-purple-600" },
  { href: "/calculators/losscut", title: "손절가", Icon: Scissors, idleClass: "text-rose-600" },
  { href: "/calculators/target", title: "목표", Icon: Target, idleClass: "text-amber-600" },
];

export default function CalculatorBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    // ✅ 모바일 전용 + 하단 고정
    <nav
      className="
        sm:hidden
        fixed bottom-0 left-0 right-0 z-50
        border-t border-slate-200/80
        bg-white/90 backdrop-blur
        pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]
      "
      role="navigation"
      aria-label="계산기 하단 네비게이션"
    >
      <div className="mx-auto max-w-[1200px] px-2">
        {/* ✅ 아이템 많아서 가로 스크롤 1줄 */}
        <div
          className="
            flex items-center gap-2
            overflow-x-auto overscroll-x-contain
            [-webkit-overflow-scrolling:touch]
            pb-1
          "
        >
          {items.map((m) => {
            const active = isActive(m.href);
            const Icon = m.Icon;

            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "shrink-0",
                  "w-[70px] h-[58px]",
                  "rounded-2xl",
                  "flex flex-col items-center justify-center gap-1",
                  "transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                    : "bg-slate-50 text-slate-800 hover:bg-slate-100",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "w-[22px] h-[22px]",
                    active ? "text-white" : m.idleClass,
                  ].join(" ")}
                />
                <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                  {m.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
