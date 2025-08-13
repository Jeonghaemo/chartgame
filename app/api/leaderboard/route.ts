// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id || null;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "7d";

  let where: any = {};
  if (period === "7d") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { gte: sevenDaysAgo };
  }

  // 1) 전체 기록 불러오기
  const allScores = await prisma.score.findMany({
    where,
    orderBy: { returnPct: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  // 2) 유저별 최고 기록만 남기기
  const bestByUser = new Map<string, typeof allScores[0]>();
  for (const s of allScores) {
    if (!bestByUser.has(s.userId)) {
      bestByUser.set(s.userId, s);
    }
  }

  // 3) 랭킹 부여
  const ranked = Array.from(bestByUser.values())
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((s, idx) => ({
      rank: idx + 1,
      userId: s.userId,
      nickname: s.user?.name || (s.user?.email ? s.user.email.split("@")[0] : "익명"),
      returnPct: s.returnPct,
      total: s.total,
    }));

  const top20 = ranked.slice(0, 20);
  const myRank = userId ? ranked.find((r) => r.userId === userId) || null : null;

  return NextResponse.json({
    ok: true,
    period,
    top20,
    myRank,
  });
}
