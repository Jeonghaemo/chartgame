import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { symbol, total, returnPct, gameId } = await req.json();

  if (!symbol || typeof total !== "number") {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // Game 종료 기록(선택적으로 gameId가 있으면 해당 레코드 종료)
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
        startCash: 10_000_000,
        startIndex: 0,
        endIndex: 0,
        feeBps: 5,
        maxTurns: 50,
        finishedAt: new Date(),
        returnPct,
      },
    });
  }

  // 사용자 자본금 업데이트(지속)
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
    select: { id: true, code: true, returnPct: true, createdAt: true }
  });
  return NextResponse.json({ top });
}
