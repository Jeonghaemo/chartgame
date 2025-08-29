// lib/ads.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";

dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = "Asia/Seoul";
const MAX_PER_DAY = 10;                  // 🔸일일 한도 10회
export type Provider = "COUPANG" | "NAVER";

// 간단 로테이션: 1,3,5,... -> COUPANG / 2,4,6,... -> NAVER
function pickProviderByCount(countToday: number): Provider {
  // 다음 시도 인덱스(1..10)
  const nextIndex = countToday + 1;
  return nextIndex % 2 === 1 ? "COUPANG" : "NAVER";
}

export async function getAdStatus(userId: string) {
  const now = dayjs().tz(ZONE);
  const dayKey = now.format("YYYY-MM-DD");

  // 오늘 지급/시도 기록만 집계 (클릭 기준 아님)
  const countToday = await prisma.adWatch.count({
    where: { userId, dayKey },
  });

  // 한도 초과 -> DAILY_LIMIT만 반환 (쿨타임 없음)
  if (countToday >= MAX_PER_DAY) {
    return {
      eligible: false as const,
      reason: "DAILY_LIMIT" as const,
      remaining: 0,
    };
  }

  const nextIndex = countToday + 1;         // 1..10
  const provider = pickProviderByCount(countToday);

  return {
    eligible: true as const,
    remaining: MAX_PER_DAY - countToday,
    nextIndex,
    provider,                                // "COUPANG" | "NAVER"
    dayKey,
  };
}

export function providerToUrl(p: Provider) {
  if (p === "COUPANG") return process.env.COUPANG_AFF_URL!;
  return process.env.NAVER_CONNECT_URL!;
}
