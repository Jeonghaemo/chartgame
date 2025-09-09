import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';
type RankRow = {
  rank: number;
  userId: string;
  nickname: string;
  // 최근 기록(정렬 기준 유지)
  returnPct: number;
  total: number;
  // 집계 지표(기간 내)
  games: number;
  avgReturnPct: number; // ✅ 평균 수익률
  wins: number;
  losses: number;
  winRate: number;      // 0~100
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") ?? "7d") as "7d" | "all";

    const where: any = {};
    if (period === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      where.createdAt = { gte: d };
    }

    // 1) 최신 스코어(랭킹 기준 유지)
    const all = await prisma.score.findMany({
      where,
      orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
      select: {
        userId: true,
        total: true,
        returnPct: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });
    const latestByUser = new Map<string, typeof all[number]>();
    for (const row of all) if (!latestByUser.has(row.userId)) latestByUser.set(row.userId, row);

    // 2) 기간 내 전 게임으로 집계 (평균/승패/승률/게임수)
    const periodScores = await prisma.score.findMany({
      where,
      select: { userId: true, returnPct: true },
    });

    type Stat = { sum: number; cnt: number; wins: number; losses: number; winRate: number };
    const stats = new Map<string, Stat>();

    for (const s of periodScores) {
      const rp = Number(s.returnPct ?? 0);
      const cur = stats.get(s.userId) ?? { sum: 0, cnt: 0, wins: 0, losses: 0, winRate: 0 };
      cur.sum += rp;
      cur.cnt += 1;
      if (rp > 0) cur.wins += 1;
      else cur.losses += 1; // 무 없음: rp <= 0 은 패
      stats.set(s.userId, cur);
    }
    for (const [uid, st] of stats) {
      const games = st.cnt || 0;
      const winRate = games > 0 ? (st.wins / games) * 100 : 0;
      st.winRate = winRate;
      stats.set(uid, st);
    }

    // 3) 정렬(기존 기준 유지)
    const rows = Array.from(latestByUser.values()).sort((a, b) => {
      const at = Number(a.total ?? 0), bt = Number(b.total ?? 0);
      if (bt !== at) return bt - at;
      const ar = Number(a.returnPct ?? 0), br = Number(b.returnPct ?? 0);
      if (br !== ar) return br - ar;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // 4) 랭크 + 집계 합치기
    const ranked: RankRow[] = rows.map((r, i) => {
      const st = stats.get(r.userId) ?? { sum: 0, cnt: 0, wins: 0, losses: 0, winRate: 0 };
      const avg = st.cnt > 0 ? st.sum / st.cnt : 0;
      return {
        rank: i + 1,
        userId: r.userId,
        nickname: r.user?.name || (r.user?.email ? r.user.email.split("@")[0] : "익명"),
        returnPct: Number(r.returnPct ?? 0),
        total: Number(r.total ?? 0),
        games: st.cnt,
        avgReturnPct: Number(avg.toFixed(2)),       // 소수 2자리로 고정
        wins: st.wins,
        losses: st.losses,
        winRate: Number(st.winRate.toFixed(1)),
      };
    });

    const top20 = ranked.slice(0, 20);
    const myRank = userId ? ranked.find(r => r.userId === userId) ?? null : null;

    return NextResponse.json({ ok: true, period, top20, myRank });
  } catch (e) {
    console.error("/api/leaderboard error", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
