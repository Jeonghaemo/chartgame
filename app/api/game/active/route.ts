// app/api/game/active/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeGameId: true },
  });

  if (!me?.activeGameId) {
    return NextResponse.json({ ok: true, active: null });
  }

  const game = await prisma.game.findUnique({
    where: { id: me.activeGameId },
    include: {
      snapshots: {
        orderBy: { ts: "desc" },
        take: 1,
      },
    },
  });

  if (!game || game.status !== "IN_PROGRESS") {
    return NextResponse.json({ ok: true, active: null });
  }

  const snap = game.snapshots[0] ?? null;
  return NextResponse.json({
    ok: true,
    active: {
      id: game.id,
      status: game.status,
      code: game.code,
      startCash: game.startCash,
      startIndex: game.startIndex,
      endIndex: game.endIndex,
      maxTurns: game.maxTurns,
      feeBps: game.feeBps,
      createdAt: game.createdAt,
      // 마지막 스냅샷(없으면 null)
      snapshot: snap && {
        ts: snap.ts,
        equity: snap.equity,
        cash: snap.cash,
        position: snap.position,
        turn: snap.turn ?? null,
        avgPrice: snap.avgPrice ?? null,
        history: snap.history ? JSON.parse(snap.history) : [],
      },
    },
  });
}
