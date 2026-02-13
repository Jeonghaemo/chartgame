// components/CalculatorBottomNav.tsx
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

type Tool = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const tools: Tool[] = [
  { href: "/game", label: "차트게임", Icon: BarChart3 },
  { href: "/calculators/average", label: "평단가", Icon: Layers3 },
  { href: "/calculators/compound", label: "복리", Icon: Calculator },
  { href: "/calculators/fee", label: "수수료", Icon: Percent },
  { href: "/calculators/water", label: "물타기", Icon: Droplet },
  { href: "/calculators/yield", label: "수익률", Icon: TrendingUp },
  { href: "/calculators/exchange", label: "환율", Icon: Coins },
  { href: "/calculators/tax", label: "양도세", Icon: CircleDollarSign },
  { href: "/calculators/losscut", label: "손절가", Icon: Scissors },
  { href: "/calculators/target", label: "목표", Icon: Target },
];

export default function CalculatorBottomNav() {
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // ✅ 계산기 섹션에서만 active 잡기: /calculators/* 는 상위도 포함
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    const activeIdx = tools.findIndex((t) => isActive(t.href));
    if (activeIdx === -1) return;

    const activeEl = itemRefs.current[activeIdx];
    const container = containerRef.current;
    if (!activeEl || !container) return;

    const itemLeft = activeEl.offsetLeft;
    const itemWidth = activeEl.offsetWidth;
    const containerWidth = container.offsetWidth;

    const targetScrollLeft = itemLeft - containerWidth / 2 + itemWidth / 2;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        sm:hidden
        border-t border-slate-200/80
        bg-white/90 backdrop-blur
        shadow-lg
        pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]
      "
      aria-label="계산기 하단 네비"
    >
      <div className="mx-auto max-w-[1200px] px-2">
        <div className="overflow-x-auto" ref={containerRef}>
          <div className="flex flex-nowrap gap-2 px-1 whitespace-nowrap">
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
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex flex-col items-center justify-center",
                    "min-w-[72px] px-2 py-2 rounded-2xl transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-[1.02]"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <Icon className={["w-5 h-5", active ? "text-white" : "text-indigo-600"].join(" ")} />
                  <span className="text-[11px] font-bold leading-none mt-1">
                    {t.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
