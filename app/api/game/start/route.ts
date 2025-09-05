import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeHeart, refillHearts } from '@/lib/hearts'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json().catch(() => ({}))
    const { symbol, code, startIndex, startCash, feeBps, maxTurns, forceNew } = body ?? {}
    const gameCode: string = String(code ?? symbol ?? '').trim()
    if (!gameCode) {
      return NextResponse.json({ error: 'BAD_CODE' }, { status: 400 })
    }

    await refillHearts(userId)

    if (!forceNew) {
      const existing = await prisma.game.findFirst({
        where: { userId, finishedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (existing) {
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { hearts: true } })
        return NextResponse.json({ ok: true, gameId: existing.id, hearts: me?.hearts ?? 0, reused: true })
      }
    }

    try {
      await consumeHeart(userId)
    } catch (e: any) {
      if (e?.message === 'NO_HEART') return NextResponse.json({ error: 'NO_HEART' }, { status: 400 })
      if (e?.message === 'USER_NOT_FOUND') return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
      return NextResponse.json({ error: 'HEART_CONSUME_FAILED' }, { status: 500 })
    }

    const sliceStartTs = typeof body?.sliceStartTs === 'number' ? body.sliceStartTs : null

    const game = await prisma.game.create({
      data: {
        userId,
        code: gameCode,
        symbol: gameCode,                                  // ✅ 새 필드
        startIndex: Number(startIndex ?? 0),
        sliceStartTs,                                      // ✅ 새 필드
        startCash: Number(startCash ?? 10_000_000),
        feeBps: Number(feeBps ?? 5),
        maxTurns: Number(maxTurns ?? 60),
      },
      select: { id: true, symbol: true, startIndex: true, sliceStartTs: true }, // ✅
    })

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { hearts: true },
    })

    return NextResponse.json({
      ok: true,
      gameId: game.id,
      symbol: game.symbol,
      startIndex: game.startIndex,
      sliceStartTs: game.sliceStartTs,
      hearts: me?.hearts ?? 0,
      reused: false,
    })
  } catch (e) {
    console.error('/api/game/start error', e)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
