// components/CalculatorNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
    <div className="w-full overflow-hidden">
      <nav
        className="
          flex flex-nowrap items-center justify-between gap-1
          rounded-xl bg-gradient-to-r from-slate-50 via-blue-50 to-slate-100
          p-2 shadow-inner font-gowun
        "
      >
        {items.map((m) => {
          const active = isActive(m.href);
          const Icon = m.Icon;

          return (
            <Link
              key={m.href}
              href={m.href}
              className={[
                "flex-1 min-w-0",
                "flex flex-col items-center justify-center",
                "gap-[2px] rounded-lg py-2 transition",
                active
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "text-slate-700 hover:bg-blue-100",
              ].join(" ")}
            >
              <Icon
                className={[
                  "shrink-0",
                  // 아이콘도 자동 크기 반응형
                  "w-[clamp(14px,3vw,20px)] h-[clamp(14px,3vw,20px)]",
                  active ? "text-white" : m.color,
                ].join(" ")}
              />

              {/* ✅ … 없이 자동 글자 축소 */}
              <span className="whitespace-nowrap text-[clamp(9px,2.4vw,13px)] leading-none">
                {m.title}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
