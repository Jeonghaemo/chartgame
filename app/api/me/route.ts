// app/api/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refillHearts } from "@/lib/hearts"; // ✅ 1분 충전 규칙을 여기에 반영해둠

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ✅ 매 호출 시 서버 기준으로 하트 자동 충전(1분 주기 로직은 hearts.ts에 있음)
  await refillHearts(session.user.id);

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,     // ✅ 네이버 검수용: 실사용 노출 필드
      email: true,    // ✅ 네이버 검수용: 실사용 노출 필드
      capital: true,
      hearts: true,
      maxHearts: true,
      lastRefillAt: true,
    },
  });

  if (!u) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      name: u.name ?? null,        // ✅ 검수용 노출
      email: u.email ?? null,      // ✅ 검수용 노출
      capital: u.capital,
      hearts: u.hearts,
      maxHearts: u.maxHearts,
      lastRefillAt: u.lastRefillAt ? u.lastRefillAt.toISOString() : null, // ✅ null 안전
    },
  });
}
