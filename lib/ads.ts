// lib/ads.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";

dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = "Asia/Seoul";
const MAX_PER_DAY = 10; // 일일 한도 10회

export type Provider = "COUPANG" | "NAVER";

/** 상태 조회 응답 타입 (분기 안전) */
export type AdStatus =
  | {
      eligible: false;
      reason: "DAILY_LIMIT";
      remaining: 0;
      dayKey: string; // YYYY-MM-DD
    }
  | {
      eligible: true;
      remaining: number; // MAX_PER_DAY - todayCount
      nextIndex: number; // 1..MAX_PER_DAY
      provider: Provider;
      dayKey: string; // YYYY-MM-DD
    };

/** 간단 로테이션: 1,3,5,... -> COUPANG / 2,4,6,... -> NAVER */
function pickProviderByCount(countToday: number): Provider {
  const nextIndex = countToday + 1; // 1..MAX_PER_DAY
  return nextIndex % 2 === 1 ? "COUPANG" : "NAVER";
}

/** 오늘 남은 횟수/다음 제휴사 상태 조회 (쿨타임 없음) */
export async function getAdStatus(userId: string): Promise<AdStatus> {
  const now = dayjs().tz(ZONE);
  const dayKey = now.format("YYYY-MM-DD");

  // 금일 시청/보상 기록 수 (adWatch 기준)
  const countToday = await prisma.adWatch.count({
    where: { userId, dayKey },
  });

  // 한도 소진
  if (countToday >= MAX_PER_DAY) {
    return {
      eligible: false,
      reason: "DAILY_LIMIT",
      remaining: 0,
      dayKey,
    };
  }

  const nextIndex = countToday + 1; // 1..MAX_PER_DAY
  const provider = pickProviderByCount(countToday);

  return {
    eligible: true,
    remaining: MAX_PER_DAY - countToday,
    nextIndex,
    provider,
    dayKey,
  };
}

/** 제휴사별 이동 URL (미설정 시 null 반환) */
export function providerToUrl(p: Provider): string | null {
  const coupang = process.env.COUPANG_AFF_URL || "";
  const naver = process.env.NAVER_CONNECT_URL || "";
  if (p === "COUPANG") return coupang || null;
  return naver || null;
}
