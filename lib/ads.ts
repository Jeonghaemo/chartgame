// lib/ads.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";

dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = "Asia/Seoul";
const MAX_PER_DAY = 10; // 일일 한도 10회

export type Provider =
  | "COUPANG"
  | "NAVER"
  | "SKYSCANNER"
  | "AGODA"
  | "ALIEXPRESS"
  | "TRIPDOTCOM"
  | "AMAZON"
  | "KLOOK"
  | "OLIVEYOUNG";

// 고정 순환 (1~10회차)
export const PROVIDER_SEQ: Provider[] = [
  "COUPANG",
  "NAVER",
  "SKYSCANNER",
  "AGODA",
  "ALIEXPRESS",
  "TRIPDOTCOM",
  "AMAZON",
  "KLOOK",
  "OLIVEYOUNG",
  "COUPANG",
] as const;

/** 상태 조회 응답 타입 */
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

export async function getAdStatus(userId: string): Promise<AdStatus> {
  const now = dayjs().tz(ZONE);
  const dayKey = now.format("YYYY-MM-DD");

  const countToday = await prisma.adWatch.count({
    where: { userId, dayKey },
  });

  if (countToday >= MAX_PER_DAY) {
    return {
      eligible: false,
      reason: "DAILY_LIMIT",
      remaining: 0,
      dayKey,
    };
  }

  const nextIndex = countToday + 1; // 1..10
  const provider = PROVIDER_SEQ[(nextIndex - 1) % PROVIDER_SEQ.length];

  return {
    eligible: true,
    remaining: MAX_PER_DAY - countToday,
    nextIndex,
    provider,
    dayKey,
  };
}

// 각 프로바이더용 URL (미발급은 빈 값 -> NAVER로 대체)
export function providerToUrl(p: Provider): string | null {
  const naver = process.env.NAVER_CONNECT_URL || "";
  const map: Record<Provider, string> = {
    COUPANG: process.env.COUPANG_AFF_URL || "",   // 쿠팡 발급 URL
    NAVER: naver,                                  // 네이버 발급 URL
    SKYSCANNER: "",                                // 미발급 → NAVER로 대체
    AGODA: "",
    ALIEXPRESS: "",
    TRIPDOTCOM: "",
    AMAZON: "",
    KLOOK: "",
    OLIVEYOUNG: "",
  };
  const raw = map[p];
  const fallback = naver || "";
  const url = raw || fallback;
  return url || null;
}
