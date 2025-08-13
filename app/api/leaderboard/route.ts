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

  // 전체 랭킹 계산
  const allScores = await prisma.score.findMany({
    where,
    orderBy: { returnPct: "desc" },
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
  });

  // 랭킹 번호 부여
  const ranked = allScores.map((s, idx) => ({
    rank: idx + 1,
    userId: s.userId,
    nickname: s.user?.name || (s.user?.email ? s.user.email.split("@")[0] : "익명"),
    returnPct: s.returnPct,
    total: s.total,
  }));

  // 상위 20위
  const top20 = ranked.slice(0, 20);

  // 내 랭킹
  const myRank = userId
    ? ranked.find((r) => r.userId === userId) || null
    : null;

  return NextResponse.json({
    ok: true,
    period,
    top20,
    myRank, // 없으면 null
  });
}
