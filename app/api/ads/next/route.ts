// app/api/ads/next/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdStatus } from "@/lib/ads";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const s = await getAdStatus(session.user.id);

  if (!s.eligible) {
    return NextResponse.json({
      ok: true,
      eligible: false,
      reason: s.reason,              // "DAILY_LIMIT" | "COOLDOWN"
      remaining: s.remaining,        // 남은 횟수
      cooldownSeconds: s.cooldownSeconds, // 남은 쿨타임(초)
    });
  }

  return NextResponse.json({
    ok: true,
    eligible: true,
    remaining: s.remaining,
    nextIndex: s.nextIndex,          // 1..4
    provider: s.provider,            // "COUPANG" | "NAVER"
  });
}
