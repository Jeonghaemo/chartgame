// app/api/ads/next/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdStatus } from "@/lib/ads";

// 응답 타입 요약:
// eligible=false 인 경우 reason은 "DAILY_LIMIT"만 허용(쿨타임 폐지)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // getAdStatus는 내부에서 "하루 10회 한도"만 체크하도록 수정되어 있어야 함.
  // (쿨타임 없음, COOLDOWN 절대 반환 금지)
  const s = await getAdStatus(session.user.id);

  if (!s.eligible) {
    // 쿨타임 제거 정책에 따라 reason은 DAILY_LIMIT만 내려보냄
    return NextResponse.json({
      ok: true,
      eligible: false,
      reason: "DAILY_LIMIT" as const,
      remaining: s.remaining ?? 0, // 남은 횟수(보통 0)
    });
  }

  // 다음 노출/제휴 정보
  return NextResponse.json({
    ok: true,
    eligible: true,
    remaining: s.remaining,       // 오늘 남은 횟수 (10 - todayCount)
    nextIndex: s.nextIndex,       // 로테이션 인덱스(필요시)
    provider: s.provider,         // "COUPANG" | "NAVER" ...
  });
}
