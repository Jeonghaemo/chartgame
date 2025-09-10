// app/api/ads/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!u) return new NextResponse("User not found", { status: 404 });

  const nextHearts = Math.min(u.maxHearts, u.hearts + 1);
  if (nextHearts !== u.hearts) {
    await prisma.user.update({
      where: { id: u.id },
      data: { hearts: nextHearts },
    });
  }

  return NextResponse.json({ ok: true, hearts: nextHearts });
}
