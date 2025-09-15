// components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  // 별도 옵션 필요 없으면 기본값으로 OK
  return <SessionProvider>{children}</SessionProvider>;
}
