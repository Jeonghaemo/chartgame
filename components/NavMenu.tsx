// components/NavMenu.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaChartLine, FaTrophy, FaCalculator } from "react-icons/fa";

export default function NavMenu() {
  const pathname = usePathname();

  const menus = [
    { href: "/", label: "홈", icon: FaHome, idleClass: "text-blue-600" },
    { href: "/game", label: "차트게임", icon: FaChartLine, idleClass: "text-emerald-600" },
    { href: "/leaderboard", label: "랭킹보기", icon: FaTrophy, idleClass: "text-amber-500" },
    { href: "/calculators", label: "투자 계산기", icon: FaCalculator, idleClass: "text-violet-600" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="
    flex justify-center items-center gap-1.5
    rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-100
    p-2 sm:p-1.5 shadow-inner
    text-xs sm:text-base font-gowun
  "
>
      {menus.map((m) => {
        const active = isActive(m.href);
        const Icon = m.icon;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition font-medium",
              "text-sm sm:text-base",
              active
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                : "text-slate-800 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow",
            ].join(" ")}
          >
            <Icon
              className={[
                "text-base sm:text-lg",
                active ? "text-white" : m.idleClass,
              ].join(" ")}
            />
            <span className="leading-none">{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
