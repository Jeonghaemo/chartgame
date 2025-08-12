// lib/ads.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";

dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = "Asia/Seoul";
const MAX_PER_DAY = 4;
const COOLDOWN_HOURS = 6;
export type Provider = "COUPANG" | "NAVER";
const SEQ: Provider[] = ["COUPANG", "NAVER", "COUPANG", "NAVER"];

export async function getAdStatus(userId: string) {
  const now = dayjs().tz(ZONE);
  const dayKey = now.format("YYYY-MM-DD");

  const watches = await prisma.adWatch.findMany({
    where: { userId, dayKey },
    orderBy: { clickedAt: "desc" },
  });

  const countToday = watches.length;
  if (countToday >= MAX_PER_DAY) {
    return { eligible: false as const, reason: "DAILY_LIMIT" as const, remaining: 0, cooldownSeconds: 0 };
  }

  const last = watches[0];
  if (last) {
    const nextAt = dayjs(last.clickedAt).add(COOLDOWN_HOURS, "hour");
    const diff = nextAt.diff(now, "second");
    if (diff > 0) {
      return {
        eligible: false as const,
        reason: "COOLDOWN" as const,
        remaining: MAX_PER_DAY - countToday,
        cooldownSeconds: diff,
      };
    }
  }

  const nextIndex = countToday + 1; // 1..4
  const provider = SEQ[nextIndex - 1];
  return {
    eligible: true as const,
    reason: null as null,
    remaining: MAX_PER_DAY - countToday,
    cooldownSeconds: 0,
    nextIndex,
    provider,
    dayKey,
  };
}

export function providerToUrl(p: Provider) {
  if (p === "COUPANG") return process.env.COUPANG_AFF_URL!;
  return process.env.NAVER_CONNECT_URL!;
}
