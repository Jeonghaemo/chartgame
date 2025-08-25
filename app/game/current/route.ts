// app/api/game/current/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  // 진행 중인(미완료) 가장 최근 게임
  const game = await prisma.game.findFirst({
    where: { userId, finishedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      startCash: true,
      startIndex: true,
      maxTurns: true,
      feeBps: true,
    },
  })

  if (!game) {
    return NextResponse.json({ ok: true, game: null })
  }

  // 최신 스냅샷 1개 (추가 필드들 포함)
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
      symbol: game.code,
      startCash: game.startCash,
      startIndex: game.startIndex,
      maxTurns: game.maxTurns,
      feeBps: game.feeBps,
      snapshot: snapshot
        ? { 
            cursor: snapshot.ts, 
            cash: snapshot.cash, 
            shares: snapshot.position,
            turn: snapshot.turn,
            avgPrice: snapshot.avgPrice,
            history: snapshot.history ? JSON.parse(snapshot.history) : [],
          }
        : null,
    },
  })
}