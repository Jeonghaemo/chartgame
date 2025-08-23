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
    const {
      gameId,
      finalCapital,         // 최종 총자산 (필수)
      returnPct,            // 수익률 % (필수)
      symbol,               // Score 저장용 (선택)
      endIndex,             // 마지막 턴 인덱스 (선택)
    } = body ?? {}

    // --- 유효성 점검 ---
    if (!gameId) {
      return NextResponse.json({ error: 'MISSING_GAME_ID' }, { status: 400 })
    }
    const endCapNum = Number(finalCapital)
    const retPctNum = Number(returnPct)
    if (!Number.isFinite(endCapNum) || !Number.isFinite(retPctNum)) {
      return NextResponse.json({ error: 'INVALID_NUMERIC_VALUES' }, { status: 400 })
    }

    // --- 소유권 검증 ---
    const game = await prisma.game.findUnique({
      where: { id: String(gameId) },
      select: { id: true, userId: true, startCash: true },
    })
    if (!game || game.userId !== userId) {
      return NextResponse.json({ error: 'GAME_NOT_FOUND' }, { status: 404 })
    }

    // --- 게임 종료 정보 업데이트 ---
    await prisma.game.update({
      where: { id: game.id }, // update는 고유키만 허용하므로 id만 사용
      data: {
        endIndex: typeof endIndex === 'number' ? endIndex : 60, // 필요 시 g.cursor 값 보내서 대체 가능
        finishedAt: new Date(),
        returnPct: retPctNum,
      },
    })

    // --- Score 기록 (선택) ---
    if (symbol) {
      await prisma.score.create({
        data: {
          userId,
          symbol: String(symbol),
          total: Math.round(endCapNum),
          returnPct: retPctNum,
          gameId: game.id,
        },
      })
    }

    // --- 유저 자본 동기화 ---
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { capital: Math.round(endCapNum) },
      select: { capital: true },
    })

    return NextResponse.json({ ok: true, capital: updatedUser.capital })
  } catch (e) {
    console.error('/api/game/finish error', e)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
