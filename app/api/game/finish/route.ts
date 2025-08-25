import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json().catch(() => ({}))
    const { gameId, finalCapital, returnPct, symbol, endIndex } = body ?? {}

    // 1) 기본 검증
    if (!gameId) {
      return NextResponse.json({ error: 'MISSING_GAME_ID' }, { status: 400 })
    }
    const endCapNum = Number(finalCapital)
    const retPctNum = Number(returnPct)
    if (!Number.isFinite(endCapNum) || !Number.isFinite(retPctNum)) {
      return NextResponse.json({ error: 'INVALID_NUMERIC_VALUES' }, { status: 400 })
    }
    const endIdxNumRaw = Number(endIndex)
    const endIdxNum = Number.isFinite(endIdxNumRaw) ? endIdxNumRaw : undefined

    // 2) 소유권/상태 조회
    const game = await prisma.game.findUnique({
      where: { id: String(gameId) },
      select: { id: true, userId: true, startCash: true, finishedAt: true, startIndex: true, maxTurns: true },
    })
    if (!game || game.userId !== userId) {
      return NextResponse.json({ error: 'GAME_NOT_FOUND' }, { status: 404 })
    }

    // 이미 종료된 게임 재호출이면 idempotent 처리
    if (game.finishedAt) {
      // 자본 동기화만 한 번 더 보장하고 OK 반환해도 됨(선택)
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { capital: Math.round(endCapNum) },
        select: { capital: true },
      })
      return NextResponse.json({ ok: true, capital: updatedUser.capital, alreadyFinished: true })
    }

    // 3) endIndex 보정 (선택)
    const maxIdx = (game.startIndex ?? 0) + (game.maxTurns ?? 60) - 1
    const safeEndIndex = endIdxNum != null
      ? Math.max(game.startIndex ?? 0, Math.min(endIdxNum, maxIdx))
      : maxIdx // 값이 없으면 마지막 턴으로

    // 4) 트랜잭션(선택) — 업데이트 + 점수 + 자본 동기화
    const result = await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: game.id },
        data: {
          endIndex: safeEndIndex,
          finishedAt: new Date(),
          returnPct: retPctNum,
        },
      })

      if (symbol) {
        await tx.score.create({
          data: {
            userId,
            symbol: String(symbol),
            total: Math.round(endCapNum),
            returnPct: retPctNum,
            gameId: game.id,
          },
        })
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { capital: Math.round(endCapNum) },
        select: { capital: true },
      })

      return updatedUser.capital
    })

    return NextResponse.json({ ok: true, capital: result })
  } catch (e) {
    console.error('/api/game/finish error', e)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
