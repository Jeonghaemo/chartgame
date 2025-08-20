import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { symbol, total, returnPct, gameId, startCash } = await req.json();

  if (!symbol || typeof total !== "number" || typeof returnPct !== "number") {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // 1) Game 종료 처리
  let finalGameId = gameId;
  if (finalGameId) {
    await prisma.game.update({
      where: { id: finalGameId },
      data: { finishedAt: new Date(), returnPct },
    });
  } else {
    const game = await prisma.game.create({
      data: {
        userId: session.user.id,
        code: symbol,
        startCash: startCash ?? 10_000_000,
        startIndex: 0,
        endIndex: 0,
        feeBps: 5,
        maxTurns: 60,
        finishedAt: new Date(),
        returnPct,
      },
    });
    finalGameId = game.id;
  }

  // 2) Score 기록 저장 (동일한 게임 중복 저장 방지)
  const exists = await prisma.score.findFirst({
    where: { userId: session.user.id, gameId: finalGameId },
  });

  if (!exists) {
    await prisma.score.create({
      data: {
        userId: session.user.id,
        symbol,
        total,
        returnPct,
        gameId: finalGameId,
      },
    });
  }

  // 3) User 자본금 업데이트
  await prisma.user.update({
    where: { id: session.user.id },
    data: { capital: Math.max(0, Math.floor(total)) },
  });

  return NextResponse.json({ ok: true });
}
