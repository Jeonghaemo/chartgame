import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RankRow = {
  rank: number;
  userId: string;
  nickname: string;
  returnPct: number;
  total: number;
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") ?? "7d") as "7d" | "all";

    // 기간 필터
    const where: any = {};
    if (period === "7d") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { gte: sevenDaysAgo };
    }

    // ✅ 유저별 "최신" 스코어만 추리기 위해
    // userId ASC → createdAt DESC 로 정렬해서 첫 등장만 채택
    const all = await prisma.score.findMany({
      where,
      orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        userId: true,
        total: true,
        returnPct: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    // 유저별 최신만 남기기
    const latestByUser = new Map<string, typeof all[number]>();
    for (const row of all) {
      if (!latestByUser.has(row.userId)) {
        latestByUser.set(row.userId, row); // 정렬상 첫 번째가 최신
      }
    }

    // 정렬 기준: 총자산 DESC → 수익률 DESC → 생성시각 DESC
    const rows = Array.from(latestByUser.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.returnPct !== a.returnPct) return b.returnPct - a.returnPct;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // 랭크 매기기
    const ranked: RankRow[] = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.user?.name || (r.user?.email ? r.user.email.split("@")[0] : "익명"),
      returnPct: r.returnPct ?? 0,
      total: r.total ?? 0,
    }));

    const top20 = ranked.slice(0, 20);
    const myRank = userId ? ranked.find(r => r.userId === userId) ?? null : null;

    return NextResponse.json({ ok: true, period, top20, myRank });
  } catch (e) {
    console.error("/api/leaderboard error", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
