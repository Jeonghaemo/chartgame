import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { gameId, finalCapital, returnPct, symbol } = await req.json();

  if (!gameId || !finalCapital || returnPct === undefined) {
    return new NextResponse("Invalid Data", { status: 400 });
  }

  // 게임 종료 처리
  await prisma.game.update({
    where: { id: gameId, userId: session.user.id },
    data: {
      endIndex: 60, // 마지막 턴
      finishedAt: new Date(),
      returnPct: returnPct,
    },
  });

  // 랭킹 기록 저장
  await prisma.score.create({
    data: {
      userId: session.user.id,
      symbol,
      total: finalCapital,
      returnPct,
      gameId,
    },
  });

  return NextResponse.json({ ok: true });
}
