// app/api/game/progress/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => ({}))
  const { gameId, ts, cash, shares, equity, turn, avgPrice, history } = body ?? {}

  if (!gameId || typeof ts !== 'number') {
    return NextResponse.json({ error: 'BAD_INPUT' }, { status: 400 })
  }

  const game = await prisma.game.findUnique({
    where: { id: String(gameId) },
    select: { id: true, userId: true, finishedAt: true },
  })
  if (!game || game.userId !== userId) {
    return NextResponse.json({ error: 'GAME_NOT_FOUND' }, { status: 404 })
  }
  if (game.finishedAt) {
    return NextResponse.json({ error: 'GAME_FINISHED' }, { status: 400 })
  }

  // 거래 히스토리를 JSON 문자열로 변환
  const historyJson = history ? JSON.stringify(history) : null

  // @@unique([gameId, ts]) 기준으로 업서트
  await prisma.balanceSnapshot.upsert({
    where: { gameId_ts: { gameId: game.id, ts } },
    create: {
      gameId: game.id,
      ts,
      cash: Number.isFinite(cash) ? cash : 0,
      position: Number.isFinite(shares) ? shares : 0,
      equity: Number.isFinite(equity) ? equity : 0,
      turn: Number.isFinite(turn) ? turn : null,
      avgPrice: Number.isFinite(avgPrice) ? avgPrice : null,
      history: historyJson,
    },
    update: {
      cash: Number.isFinite(cash) ? cash : 0,
      position: Number.isFinite(shares) ? shares : 0,
      equity: Number.isFinite(equity) ? equity : 0,
      turn: Number.isFinite(turn) ? turn : null,
      avgPrice: Number.isFinite(avgPrice) ? avgPrice : null,
      history: historyJson,
    },
  })

  return NextResponse.json({ ok: true })
}