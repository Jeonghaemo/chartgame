import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 새로운 게임 생성
  const game = await prisma.game.create({
    data: {
      userId: session.user.id,
      code: "SOME_STOCK", // 시작 종목코드, 필요시 변경
      startCash: 10000000,
      startIndex: 0, // 시작 인덱스
      maxTurns: 60,
      feeBps: 5,
    },
  });

  return NextResponse.json({ ok: true, gameId: game.id });
}
