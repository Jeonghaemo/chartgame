import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { symbol, total, returnPct, gameId } = await req.json();

  if (!symbol || typeof total !== "number") {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // 1) Game 종료 처리
  if (gameId) {
    await prisma.game.update({
      where: { id: gameId },
      data: { finishedAt: new Date(), returnPct },
    });
  } else {
    await prisma.game.create({
      data: {
        userId: session.user.id,
        code: symbol,
        startCash: 10_000_000, // 필요시 ChartGame에서 받은 startCash로 수정 가능
        startIndex: 0,
        endIndex: 0,
        feeBps: 5,
        maxTurns: 50,
        finishedAt: new Date(),
        returnPct,
      },
    });
  }

  // 2) Score 기록 저장 (모델명/필드명은 schema.prisma에 맞게 조정)
  try {
    await prisma.score.create({
      data: {
        userId: session.user.id,
        symbol,
        total,
        returnPct,
        gameId: gameId ?? undefined,
      },
    });
  } catch (err) {
    console.error("Score save skipped or failed:", err);
  }

  // 3) User 자본금 업데이트
  await prisma.user.update({
    where: { id: session.user.id },
    data: { capital: Math.max(0, Math.floor(total)) },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const top = await prisma.game.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { returnPct: "desc" },
    take: 50,
    select: { id: true, code: true, returnPct: true, createdAt: true },
  });
  return NextResponse.json({ top });
}
