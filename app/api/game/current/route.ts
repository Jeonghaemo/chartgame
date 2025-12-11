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
      symbol: true,
      startCash: true,
      startIndex: true,
      sliceStartTs: true,
      maxTurns: true,
      feeBps: true,
    },
  })

  if (!game) {
    return NextResponse.json({ ok: true, game: null })
  }

  // 🔥 여기 추가: symbol이 비어있으면 code를 심볼로 사용
  const normalizedSymbol = game.symbol ?? game.code


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
      symbol: normalizedSymbol,   // 🔥 여기 변경
      code: game.code,
      startCash: game.startCash,
      startIndex: game.startIndex,
      sliceStartTs: game.sliceStartTs,
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
