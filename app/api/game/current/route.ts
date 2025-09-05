import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  const game = await prisma.game.findFirst({
    where: { userId, finishedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      symbol: true,         // ✅ 최신 Prisma Client에 존재해야 함
      startCash: true,
      startIndex: true,
      sliceStartTs: true,   // ✅ 추가
      maxTurns: true,
      feeBps: true,
    },
  })

  if (!game) {
    return NextResponse.json({ ok: true, game: null })
  }

  const snapshot = await prisma.balanceSnapshot.findFirst({
    where: { gameId: game.id },
    orderBy: { ts: 'desc' },
    select: {
      ts: true,
      cash: true,
      position: true,
      turn: true,
      avgPrice: true,
      history: true,
    },
  })

  return NextResponse.json({
    ok: true,
    game: {
      id: game.id,
      symbol: game.symbol,          // ✅ 일관성 있게 symbol 사용
      code: game.code,              // (원하면 함께 내려주기)
      startCash: game.startCash,
      startIndex: game.startIndex,
      sliceStartTs: game.sliceStartTs, // ✅ 서버 '진실' 앵커
      maxTurns: game.maxTurns,
      feeBps: game.feeBps,
      snapshot: snapshot
        ? {
            cursor: snapshot.ts,
            cash: snapshot.cash,
            shares: snapshot.position,
            turn: snapshot.turn ?? undefined,
            avgPrice: snapshot.avgPrice ?? undefined,
            history: snapshot.history ? JSON.parse(snapshot.history) : [],
          }
        : null,
    },
  })
}
