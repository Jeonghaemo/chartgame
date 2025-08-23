import dayjs from "dayjs";
import { prisma } from "./prisma";

/** 1시간에 1개 충전, 최대 maxHearts */
export async function refillHearts(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;

  const now = dayjs();
  const last = dayjs(u.lastRefillAt);
  const hours = Math.floor(now.diff(last, "minute"));
  if (hours <= 0) return u;

  const nextHearts = Math.min(u.maxHearts, u.hearts + hours);
  if (nextHearts === u.hearts) {
    // 충전량이 없어도 기준시점 갱신은 하지 않음
    return u;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      hearts: nextHearts,
      lastRefillAt: now.toDate(),
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
    data: { hearts: { decrement: 1 } },
  });
}
