// app/api/ads/next/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdStatus } from "@/lib/ads";

const ORDER = ["COUPANG", "NAVER", "TRIPDOTCOM", "KLOOK", "COUPANG_DEAL"] as const;
type Provider = (typeof ORDER)[number];
const DAILY_LIMIT = 5;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const s = await getAdStatus(session.user.id);

  if (!s?.eligible) {
    return NextResponse.json({
      ok: true,
      eligible: false,
      reason: "DAILY_LIMIT" as const,
      remaining: Number(s?.remaining ?? 0),
    });
  }

  const remaining = Math.max(0, Math.min(DAILY_LIMIT, Number(s.remaining ?? 0)));
  // used = DAILY_LIMIT - remaining, nextIndex = used + 1 (1~10)
  const nextIndex = Math.min(DAILY_LIMIT, (DAILY_LIMIT - remaining) + 1);

  // 1~5 반복 로테이션 강제
  const provider: Provider = ORDER[(nextIndex - 1) % ORDER.length];

  return NextResponse.json({
    ok: true,
    eligible: true,
    remaining, // 0~10
    nextIndex, // 1~10
    provider,  // "COUPANG" | "NAVER" | "TRIPDOTCOM" | "KLOOK" | "COUPANG_DEAL"
  });
}
