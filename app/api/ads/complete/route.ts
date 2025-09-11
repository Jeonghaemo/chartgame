// app/api/ads/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdStatus } from "@/lib/ads";
type AdStatus = {
  eligible: boolean;
  remaining: number;            // 오늘 남은 회수
  nextIndex?: number;
  provider?: "COUPANG" | "NAVER";
  dayKey?: string;              // YYYY-MM-DD (없으면 서버에서 생성)
};
// (선택) 개발 중 임시 우회가 필요하면 아래 주석을 풀고 ALLOW_ADS_TEST=1 사용
// function getDevUserId() {
//   return process.env.NODE_ENV === "development" && process.env.ALLOW_ADS_TEST === "1"
//     ? "DEV_ADS_TEST_USER"
//     : null;
// }

export async function POST(req: NextRequest) {
  const session = await auth();
  // const devUserId = getDevUserId();
  // const userId = session?.user?.id ?? devUserId;
  const userId = session?.user?.id;

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const providerRaw = (body?.provider || "").toString().toUpperCase();
  const provider = providerRaw === "COUPANG" || providerRaw === "NAVER" ? providerRaw : "COUPANG";

  const viewableMs = Number(body?.viewableMs ?? 0);
  const interacted = !!body?.interacted;
  const slotVisibleMaxPct = Number(body?.slotVisibleMaxPct ?? 0);

  // 노출 10초 + 상호작용 체크
  const MIN_VIEWABLE_MS = 10_000;
  const exposureOK = viewableMs >= MIN_VIEWABLE_MS && interacted;

  // 일일 상태 조회 (쿨타임 제거 정책 가정: eligible=false면 DAILY_LIMIT)
  const s = (await getAdStatus(userId)) as AdStatus;
  if (!exposureOK || !s.eligible) {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: !exposureOK ? "EXPOSURE_NOT_MET" : "DAILY_LIMIT",
      remaining: s.remaining ?? 0,
    });
  }

  // 유저 조회
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return new NextResponse("User not found", { status: 404 });

  // 하트 +1 (최대치 제한)
  let rewarded = false;
  const nextHearts = Math.min(u.maxHearts, u.hearts + 1);
  if (nextHearts !== u.hearts) {
    await prisma.user.update({ where: { id: u.id }, data: { hearts: nextHearts } });
    rewarded = true;
  }

  // 시청 기록(adWatch) 남겨서 /ads/next의 remaining 감소 반영
  try {
    // getAdStatus가 dayKey/nextIndex를 제공한다고 가정 (없으면 서버에서 Asia/Seoul 로 dayKey 생성)
    const dayKey = s.dayKey ?? new Date().toISOString().slice(0, 10);
const index = typeof s.nextIndex === "number" ? s.nextIndex : (s.remaining > 0 ? 1 : 0);


    await prisma.adWatch.create({
      data: {
        userId,
        provider,   // "COUPANG" | "NAVER"
        dayKey,     // YYYY-MM-DD
        index,      // 1..N
        // 필요시 viewable 정보도 저장 가능:
        // viewableMs, interacted, slotVisibleMaxPct
      },
    });
  } catch (e) {
    // 기록 실패해도 보상 자체는 유지
    // console.warn("adWatch create failed", e);
  }

  // 남은 횟수 재계산 (반영 확인용)
  const s2 = await getAdStatus(userId);

  return NextResponse.json({
    ok: true,
    rewarded,
    hearts: nextHearts,
    remaining: s2.remaining ?? 0,
  });
}
