// components/CalculatorNav.tsx
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
  color: string;
};

const items: Item[] = [
  // ✅ 차트게임도 다른 메뉴와 동일하게 (active일 때만 파란색)
  {
    href: "/game",
    title: "차트게임",
    Icon: BarChart3, // ✅ 차트 관련 아이콘으로 교체
    color: "text-indigo-500",
  },
  { href: "/calculators/average", title: "평단가", Icon: Layers3, color: "text-sky-500" },
  { href: "/calculators/compound", title: "복리", Icon: Calculator, color: "text-emerald-500" },
  { href: "/calculators/fee", title: "수수료", Icon: Percent, color: "text-fuchsia-500" },
  { href: "/calculators/water", title: "물타기", Icon: Droplet, color: "text-cyan-500" },
  { href: "/calculators/yield", title: "수익률", Icon: TrendingUp, color: "text-lime-500" },
  { href: "/calculators/exchange", title: "환율", Icon: Coins, color: "text-violet-500" },
  { href: "/calculators/tax", title: "양도세", Icon: CircleDollarSign, color: "text-purple-500" },
  { href: "/calculators/losscut", title: "손절가", Icon: Scissors, color: "text-rose-500" },
  { href: "/calculators/target", title: "목표", Icon: Target, color: "text-amber-500" },
];

export default function CalculatorNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    // ✅ PC 전용
    <div className="hidden sm:block w-full mb-4">
      <nav
        className="
          flex flex-nowrap items-center justify-between gap-2
          rounded-2xl bg-gradient-to-r from-slate-100 via-blue-100 to-slate-200
          p-3 shadow-lg ring-1 ring-slate-300
          font-gowun
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
                "flex-1 min-w-0",
                "flex items-center justify-center gap-2",
                "rounded-xl px-4 py-2.5",
                "transition-all duration-200",
                "font-bold text-[15px]",
                "hover:scale-[1.05] hover:shadow-md",
                active
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "bg-white text-slate-800 hover:bg-blue-50",
              ].join(" ")}
            >
              <Icon
                className={[
                  "shrink-0 w-5 h-5",
                  active ? "text-white" : m.color,
                ].join(" ")}
              />

              <span className="whitespace-nowrap">{m.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
