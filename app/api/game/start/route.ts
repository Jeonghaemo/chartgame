// app/api/game/start/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refillHearts } from '@/lib/hearts' // consumeHeart는 사용하지 않습니다.

export async function POST(req: Request) {
  // 1) 인증 + 진행중 게임 카운트
  const session = await auth()
  console.log('[start:req]', { user: session?.user?.id })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  const c = await prisma.game.count({
    where: { userId, status: 'IN_PROGRESS' },
  })
  console.log('[start:inprog-count]', c)

  try {
    const body = await req.json().catch(() => ({} as any))
    const { symbol, code, startIndex, startCash, feeBps, maxTurns, forceNew } = body ?? {}
    const gameCode: string = String(code ?? symbol ?? '').trim()
    if (!gameCode) {
      return NextResponse.json({ error: 'BAD_CODE' }, { status: 400 })
    }

    // 자동 리필 (쿨타임/정책은 refillHearts 내부에서 관리된다고 가정)
    await refillHearts(userId)

    // ------- 동시요청 직렬화 트랜잭션 -------
    async function runStartTxn() {
      return await prisma.$transaction(async (tx) => {
        // 1) 현재 하트 확인
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { hearts: true }
        })
        const hearts = currentUser?.hearts ?? 0
        if (!currentUser || hearts <= 0) {
          return { type: 'NO_HEART' as const }
        }

        // 2) 기존 게임 재사용 (forceNew가 아닌 경우)
        if (!forceNew) {
          const existing = await tx.game.findFirst({
            where: {
              userId,
              code: gameCode,
              finishedAt: null,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })

          if (existing) {
            // activeGameId 세팅
            await tx.user.update({
              where: { id: userId },
              data: { activeGameId: existing.id },
            })
            console.log('[start:reuse]', { userId, gameId: existing.id, code: gameCode })

            return {
              type: 'REUSE' as const,
              gameId: existing.id,
              hearts, // 그대로 유지
            }
          }
        }

        // 3) 하트 차감 (조건부 업데이트)
        const updated = await tx.user.update({
          where: { id: userId, AND: [{ hearts: { gt: 0 } }] },
          data: { hearts: { decrement: 1 } },
          select: { hearts: true },
        }).catch(() => null)

        if (!updated) {
          return { type: 'NO_HEART' as const }
        }

        // 4) 새 게임 생성
        const sliceStartTs =
          typeof body?.sliceStartTs === 'number' ? (body.sliceStartTs as number) : null

        const game = await tx.game.create({
          data: {
            userId,
            code: gameCode,
            symbol: gameCode,
            startIndex: Number(startIndex ?? 0),
            sliceStartTs,
            startCash: Number(startCash ?? 10_000_000),
            feeBps: Number(feeBps ?? 5),
            maxTurns: Number(maxTurns ?? 60),
          },
          select: { id: true, symbol: true, startIndex: true, sliceStartTs: true },
        })

        // activeGameId 세팅 (새 게임일 때)
        await tx.user.update({
          where: { id: userId },
          data: { activeGameId: game.id },
        })

        console.log('[start:new-created]', { userId, gameId: game.id, code: gameCode })

        return {
          type: 'NEW' as const,
          game,
          hearts: updated.hearts,
        }
      }, { isolationLevel: 'Serializable' })
    }

    // 직렬화 충돌(P2034) 대비 1회 재시도
    let result: Awaited<ReturnType<typeof runStartTxn>> | null = null
    for (let i = 0; i < 2; i++) {
      try {
        result = await runStartTxn()
        break
      } catch (err: any) {
        if (i === 1) throw err
      }
    }

    console.log('[start:result]', { userId, type: result?.type })

    if (!result) {
      return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
    }
    if (result.type === 'NO_HEART') {
      return NextResponse.json({ error: 'NO_HEART' }, { status: 400 })
    }

    // 요청 후 in-progress 카운트 확인 로그
    try {
      const cAfter = await prisma.game.count({
        where: { userId, status: 'IN_PROGRESS' },
      })
      console.log('[start:inprog-count-after]', { userId, cAfter })
    } catch {}

    if (result.type === 'REUSE') {
      return NextResponse.json({
        ok: true,
        gameId: result.gameId,
        hearts: result.hearts,
        reused: true,
      })
    }

    // NEW
    return NextResponse.json({
      ok: true,
      gameId: result.game.id,
      symbol: result.game.symbol,
      startIndex: result.game.startIndex,
      sliceStartTs: result.game.sliceStartTs,
      hearts: result.hearts,
      reused: false,
    })
  } catch (e) {
    console.error('/api/game/start error', e)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
