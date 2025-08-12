import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeHeart } from "@/lib/hearts";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { symbol, startIndex, startCash = 10_000_000, feeBps = 5, maxTurns = 50 } = body ?? {};

  try {
    await consumeHeart(session.user.id);
  } catch (e: any) {
    if (e.message === "NO_HEART") return NextResponse.json({ ok: false, error: "NO_HEART" }, { status: 400 });
    throw e;
  }

  const game = await prisma.game.create({
    data: {
      userId: session.user.id,
      code: symbol,
      startCash: startCash,
      startIndex,
      feeBps,
      maxTurns,
    },
  });

  return NextResponse.json({ ok: true, gameId: game.id });
}
