// app/api/ads/redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdStatus, providerToUrl } from "@/lib/ads";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "").toUpperCase();
  if (provider !== "COUPANG" && provider !== "NAVER") {
    return NextResponse.json({ ok: false, error: "BAD_PROVIDER" }, { status: 400 });
  }

  // 상태/순서/쿨타임 검사
  const st = await getAdStatus(session.user.id);
  if (!st.eligible) return NextResponse.json({ ok: false, error: st.reason }, { status: 400 });
  if (st.provider !== provider) return NextResponse.json({ ok: false, error: "WRONG_ORDER" }, { status: 400 });

  // 1) 시청 기록
  await prisma.adWatch.create({
    data: {
      userId: session.user.id,
      provider,             // String 저장 ("COUPANG" | "NAVER")
      dayKey: st.dayKey!,   // YYYY-MM-DD
      index: st.nextIndex!, // 1..4
    },
  });

  // 2) 하트 +1 (최대치 제한)
  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (u) {
    const nextHearts = Math.min(u.maxHearts, u.hearts + 1);
    if (nextHearts !== u.hearts) {
      await prisma.user.update({
        where: { id: u.id },
        data: { hearts: nextHearts },
      });
    }
  }

  // 3) 제휴 링크로 302 Redirect
  const target = providerToUrl(provider as "COUPANG" | "NAVER");
  if (!target) return NextResponse.json({ ok: false, error: "MISSING_AFF_URL" }, { status: 500 });

  return NextResponse.redirect(target, { status: 302 });
}
