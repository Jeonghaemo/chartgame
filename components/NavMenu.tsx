// components/NavMenu.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home as HomeIcon, LineChart, Trophy } from "lucide-react";

export default function NavMenu() {
  const pathname = usePathname();

  const menus = [
    { href: "/", label: "홈", icon: <HomeIcon className="w-5 h-5" /> },
    { href: "/game", label: "차트게임", icon: <LineChart className="w-5 h-5" /> },
    { href: "/leaderboard", label: "랭킹보기", icon: <Trophy className="w-5 h-5" /> },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
  className="
    flex items-center gap-1.5 rounded-2xl bg-slate-100
    p-1.5 sm:p-2
    text-xs sm:text-base
  "
>
      {menus.map((m) => {
        const active = isActive(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={[
  "flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition font-medium",
  "text-xs sm:text-base",   // 모바일은 작게, PC는 원래 크기
  active
    ? "bg-white shadow text-blue-600"
    : "text-slate-700 hover:bg-white hover:shadow-sm hover:text-slate-900",
].join(" ")}

          >
            {m.icon}
            <span>{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
