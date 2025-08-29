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
    <nav className="flex items-center gap-2 rounded-2xl bg-slate-100 p-2">
      {menus.map((m) => {
        const active = isActive(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl transition font-semibold",
              "text-base",             // 좀 더 크게
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
