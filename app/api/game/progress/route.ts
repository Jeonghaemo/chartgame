// app/api/game/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return new NextResponse("Bad JSON", { status: 400 });

  const {
    gameId,
    ts,          // number (커서 위치)
    equity,      // number
    cash,        // number
    position,    // number
    turn,        // number (optional)
    avgPrice,    // number (optional)
    history,     // array/object (optional)
  } = body;

  if (!gameId || typeof ts !== "number") {
    return new NextResponse("`gameId` and numeric `ts` required", { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, userId: true, status: true },
  });
  if (!game || game.userId !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (game.status !== "IN_PROGRESS") {
    return new NextResponse("Game finished", { status: 400 });
  }

  // history는 문자열로 저장
  const historyStr =
    history === undefined
      ? undefined
      : JSON.stringify(history);

  // (gameId, ts) 복합고유키로 upsert
  const upserted = await prisma.balanceSnapshot.upsert({
    where: { gameId_ts: { gameId, ts } },
    update: {
      equity: typeof equity === "number" ? equity : undefined,
      cash: typeof cash === "number" ? cash : undefined,
      position: typeof position === "number" ? position : undefined,
      turn: typeof turn === "number" ? turn : undefined,
      avgPrice: typeof avgPrice === "number" ? avgPrice : undefined,
      history: historyStr,
    },
    create: {
      gameId,
      ts,
      equity: typeof equity === "number" ? equity : 0,
      cash: typeof cash === "number" ? cash : 0,
      position: typeof position === "number" ? position : 0,
      turn: typeof turn === "number" ? turn : 0,
      avgPrice: typeof avgPrice === "number" ? avgPrice : 0,
      history: historyStr ?? "[]",
    },
  });

  // 사용자의 activeGameId 고정 (안전망)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeGameId: gameId },
  });

  return NextResponse.json({ ok: true, ts: upserted.ts });
}
