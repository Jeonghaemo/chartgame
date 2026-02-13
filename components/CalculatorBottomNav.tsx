"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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

const tools = [
  { href: "/game", label: "차트", Icon: BarChart3, color: "text-indigo-500" },
  { href: "/calculators/average", label: "평단가", Icon: Layers3, color: "text-sky-500" },
  { href: "/calculators/compound", label: "복리", Icon: Calculator, color: "text-emerald-500" },
  { href: "/calculators/fee", label: "수수료", Icon: Percent, color: "text-fuchsia-500" },
  { href: "/calculators/water", label: "물타기", Icon: Droplet, color: "text-cyan-500" },
  { href: "/calculators/yield", label: "수익률", Icon: TrendingUp, color: "text-lime-500" },
  { href: "/calculators/exchange", label: "환율", Icon: Coins, color: "text-violet-500" },
  { href: "/calculators/tax", label: "양도세", Icon: CircleDollarSign, color: "text-purple-500" },
  { href: "/calculators/losscut", label: "손절", Icon: Scissors, color: "text-rose-500" },
  { href: "/calculators/target", label: "목표", Icon: Target, color: "text-amber-500" },
];

export default function CalculatorBottomNav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    const activeIdx = tools.findIndex((t) => isActive(t.href));
    if (activeIdx === -1) return;

    const el = itemRefs.current[activeIdx];
    const container = containerRef.current;
    if (!el || !container) return;

    const scrollLeft =
      el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;

    container.scrollTo({
      left: scrollLeft,
      behavior: "smooth",
    });
  }, [pathname]);

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        sm:hidden
        bg-white border-t border-gray-200 shadow-lg
        py-1
        pb-[calc(env(safe-area-inset-bottom)+6px)]
      "
    >
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="flex flex-nowrap gap-1 px-2 whitespace-nowrap">
          {tools.map((t, i) => {
            const active = isActive(t.href);
            const Icon = t.Icon;

            return (
              <Link
                key={t.href}
                href={t.href}
                ref={(el) => {
  itemRefs.current[i] = el;
}}
                className={[
                  "flex flex-col items-center justify-center",
                  "min-w-[64px] px-2 py-1 rounded-xl",
                  "transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white scale-105"
                    : "text-gray-600 hover:text-blue-600",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "w-[22px] h-[22px]",
                    active ? "text-white" : t.color,
                  ].join(" ")}
                />
                <span className="text-[11px] font-bold mt-[2px]">
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
