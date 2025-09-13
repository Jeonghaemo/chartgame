import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 개발 모드에서만 허용 (실서버 보호)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.adWatch.deleteMany({ where: { userId: session.user.id } });

  return NextResponse.json({ ok: true });
}
