// app/api/ads/next/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdStatus } from "@/lib/ads";

// 노출 순서: 1~5 고정, 6~10 반복
// 1) COUPANG (쿠팡 위젯)
// 2) NAVER (네이버 커넥트)
// 3) TRIPDOTCOM (트립닷컴 iframe)
// 4) KLOOK (클룩 위젯)
// 5) COUPANG_DEAL (지정 배너 이미지)
const ORDER = ["COUPANG", "NAVER", "TRIPDOTCOM", "KLOOK", "COUPANG_DEAL"] as const;
type Provider = (typeof ORDER)[number];
const DAILY_LIMIT = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // getAdStatus는 "하루 10회 한도"만 체크 (쿨타임 없음)
  // 예시 반환: { eligible: boolean, remaining: number, nextIndex: number, provider?: Provider, dayKey: string }
  const s = await getAdStatus(session.user.id);

  if (!s?.eligible) {
    return NextResponse.json({
      ok: true,
      eligible: false,
      reason: "DAILY_LIMIT" as const,
      remaining: Number(s?.remaining ?? 0),
    });
  }

  // 안전 처리: remaining 정규화
  const remaining = Math.max(0, Math.min(DAILY_LIMIT, Number(s.remaining ?? 0)));

  // nextIndex 우선 사용 (getAdStatus가 계산해줬다면)
  // 없거나 범위를 벗어나면 remaining 기반으로 역산
  // used = DAILY_LIMIT - remaining, nextIndex = used + 1
  const fallbackNextIndex = Math.min(DAILY_LIMIT, (DAILY_LIMIT - remaining) + 1);
  const nextIndex =
    typeof s.nextIndex === "number" && s.nextIndex >= 1 && s.nextIndex <= DAILY_LIMIT
      ? s.nextIndex
      : fallbackNextIndex;

  // provider 우선순위: s.provider 있으면 그대로, 없으면 로테이션
  const provider: Provider =
    (typeof s.provider === "string" && (s.provider as Provider)) ||
    ORDER[(nextIndex - 1) % ORDER.length];

  return NextResponse.json({
    ok: true,
    eligible: true,
    remaining,   // 0~10
    nextIndex,   // 1~10
    provider,    // "COUPANG" | "NAVER" | "TRIPDOTCOM" | "KLOOK" | "COUPANG_DEAL"
  });
}
