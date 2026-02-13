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
        flex flex-nowrap items-center justify-center gap-1.5
        rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-100
        p-2 sm:p-1.5 shadow-inner
        font-gowun
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
              // ✅ 4개가 화면폭에 맞춰 동일비율로 줄고, 줄바꿈은 절대 안 함
              "flex-1 min-w-0",
              "flex items-center justify-center gap-1.5",
              "rounded-lg transition font-medium",
              // ✅ 모바일 패딩 살짝 축소
              "px-2 py-2 sm:px-4 sm:py-2",
              active
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                : "text-slate-800 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow",
            ].join(" ")}
          >
            <Icon
              className={[
                "shrink-0 text-[14px] sm:text-lg",
                active ? "text-white" : m.idleClass,
              ].join(" ")}
            />

            {/* ✅ … 없이: 화면이 좁으면 글자가 자동으로 작아짐 (clamp)
               - 최소 10px까지 줄고, 넓어지면 최대 16px까지 커짐
               - whitespace-nowrap으로 2줄 방지 */}
            <span className="leading-none whitespace-nowrap text-[clamp(10px,2.6vw,16px)] sm:text-base">
              {m.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
