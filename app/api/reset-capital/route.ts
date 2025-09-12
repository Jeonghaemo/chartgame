import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Asia/Seoul dayKey
function dayKeySeoul(date = new Date()) {
  const KST = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const y = KST.getFullYear()
  const m = String(KST.getMonth() + 1).padStart(2, '0')
  const d = String(KST.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const userId = session.user.id

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, capital: true, hearts: true, maxHearts: true, lastRefillAt: true },
    })
    if (!me) return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 })

    // ── 쿨다운: 하루 1회
    const today = dayKeySeoul()
    const already = await prisma.adWatch.findFirst({
      where: { userId, dayKey: today, provider: 'RESET', index: 0 }, // unique(userId, dayKey, index)
      select: { id: true },
    })
    if (already) {
      return NextResponse.json({
        ok: false,
        reason: 'COOLDOWN',
        message: '하루 1회만 초기화할 수 있습니다.',
      }, { status: 429 })
    }

    // ── 조건: 자본 3,000,000 미만일 때만
    const eligible = (me.capital ?? 0) < 10_000_000
    if (!eligible) {
      return NextResponse.json({
        ok: false,
        reason: 'NOT_ELIGIBLE',
        message: '자본이 3,000,000 이상입니다. 초기화할 수 없습니다.',
      }, { status: 400 })
    }

    // ── 초기화: 진행중 게임 정리 + 자본 리셋 + activeGameId 해제 + 리셋 로그
    const actives = await prisma.game.findMany({
      where: { userId, finishedAt: null },
      select: { id: true },
    })
    const gameIds = actives.map(g => g.id)

    await prisma.$transaction(async (tx) => {
      if (gameIds.length) {
        await tx.balanceSnapshot.deleteMany({ where: { gameId: { in: gameIds } } })
        await tx.order.deleteMany({ where: { gameId: { in: gameIds } } })
        await tx.game.deleteMany({ where: { id: { in: gameIds } } })
      }
      await tx.user.update({
        where: { id: userId },
        data: { capital: 10_000_000, activeGameId: null },
      })
      // 쿨다운 기록(AdWatch를 로그 용도으로 재사용)
      await tx.adWatch.create({
        data: {
          userId,
          provider: 'RESET',
          clickedAt: new Date(),
          dayKey: today,
          index: 0,
        },
      })
    })

    const refreshed = await prisma.user.findUnique({
      where: { id: userId },
      select: { capital: true, hearts: true, maxHearts: true, lastRefillAt: true },
    })

    return NextResponse.json({
      ok: true,
      capital: refreshed?.capital ?? 10_000_000,
      hearts: refreshed?.hearts ?? 0,
      maxHearts: refreshed?.maxHearts ?? 5,
      lastRefillAt: refreshed?.lastRefillAt ?? null,
      clearedGames: gameIds.length,
    })
  } catch (e) {
    console.error('/api/reset-capital error', e)
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 })
  }
}
