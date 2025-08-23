// app/api/game/start/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeHeart, refillHearts } from '@/lib/hearts' // hearts.ts의 실제 경로에 맞게 import

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { code, startIndex, startCash, feeBps, maxTurns } = body ?? {}

    // 1) 최신 하트 반영(충전)
    await refillHearts(userId)

    // 2) 하트 원자적 차감 (없으면 여기서 실패)
    try {
      await consumeHeart(userId)
    } catch (e: any) {
      if (e?.message === 'NO_HEART') {
        return NextResponse.json({ error: 'NO_HEART' }, { status: 400 })
      }
      if (e?.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
      }
      return NextResponse.json({ error: 'HEART_CONSUME_FAILED' }, { status: 500 })
    }

    // 3) 게임 생성 (schema.prisma의 Game.code 사용)
    const game = await prisma.game.create({
      data: {
        userId,
        code: String(code ?? ''),                    // ✅ symbol 아님. code 필드에 저장
        startIndex: Number(startIndex ?? 0),
        startCash: Number(startCash ?? 10_000_000),
        feeBps: Number(feeBps ?? 5),
        maxTurns: Number(maxTurns ?? 60),
        // finishedAt은 진행 중이므로 null, status 필드 없이도 OK
      },
      select: { id: true },
    })

    // 4) 남은 하트 반환
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { hearts: true },
    })

    return NextResponse.json({
      ok: true,
      gameId: game.id,
      hearts: me?.hearts ?? 0,
    })
  } catch (e) {
    console.error('/api/game/start error', e)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
