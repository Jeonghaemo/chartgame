import dayjs from "dayjs";
import { prisma } from "./prisma";

const HEART_REFILL_MINUTES = 60; // 1시간 = 60분

/** 1시간에 1개 충전, 최대 maxHearts (잔여 분 보존) */
export async function refillHearts(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;

  const now = dayjs();
  const last = u.lastRefillAt ? dayjs(u.lastRefillAt) : now;

  // 지난 분 계산
  const minutesPassed = Math.floor(now.diff(last, "minute"));
  if (minutesPassed < HEART_REFILL_MINUTES) {
    // 한 시간 미만이면 아직 충전 없음
    return u;
  }

  // 지난 시간(정수 시간)만큼 충전
  const earned = Math.floor(minutesPassed / HEART_REFILL_MINUTES);
  const nextHearts = Math.min(u.maxHearts, u.hearts + earned);

  if (nextHearts === u.hearts) {
    // 이미 최대치였거나 증가 없음
    // 최대치였다면 lastRefillAt을 now로 당겨 다음 카운트다운이 새로 시작되도록 할 수도 있음.
    // 정책에 따라 유지하고 싶으면 아래 주석 해제 X
    // return u;

    // 최대치 유지 정책: 최대이면 기준시점을 now로 갱신해 다음 소비 이후부터 다시 60분 카운트
    return prisma.user.update({
      where: { id: userId },
      data: { lastRefillAt: now.toDate() },
    });
  }

  // 잔여 분 보존: lastRefillAt을 "정확히 충전된 시간 수 만큼"만 앞으로 당김
  // 예: 125분 경과 → earned=2시간 → lastRefillAt = last + 120분 (잔여 5분 유지)
  const advanced = last.add(earned * HEART_REFILL_MINUTES, "minute");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      hearts: nextHearts,
      lastRefillAt: advanced.toDate(),
    },
  });
  return updated;
}

/** 게임 시작 시 하트 1 차감 */
export async function consumeHeart(userId: string) {
  const u = await refillHearts(userId);
  if (!u) throw new Error("USER_NOT_FOUND");
  if (u.hearts <= 0) throw new Error("NO_HEART");

  return prisma.user.update({
    where: { id: userId },
    data: { hearts: { decrement: 1 }, lastRefillAt: new Date() }, // 소비 시점을 기준으로 타이머 리셋
  });
}
