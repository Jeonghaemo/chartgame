// app/api/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      capital: true,
      hearts: true,
      maxHearts: true,
      lastRefillAt: true,
    },
  });

  if (!u) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // 자동 충전 로직
  const now = new Date();
  const diffHours = Math.floor(
    (now.getTime() - u.lastRefillAt.getTime()) / (1000 * 60 * 60)
  );

  if (diffHours > 0 && u.hearts < u.maxHearts) {
    const refillCount = Math.min(diffHours, u.maxHearts - u.hearts);
    u = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        hearts: { increment: refillCount },
        lastRefillAt: now,
      },
      select: {
        id: true,
        capital: true,
        hearts: true,
        maxHearts: true,
        lastRefillAt: true,
      },
    });
  }

  // lastRefillAt을 ISO 문자열로 변환
  return NextResponse.json({
    ok: true,
    user: {
      ...u,
      lastRefillAt: u.lastRefillAt.toISOString(),
    },
  });
}
