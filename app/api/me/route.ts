// app/api/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      capital: true,
      hearts: true,
      maxHearts: true,
    },
  });

  if (!u) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: u,
  });
}
