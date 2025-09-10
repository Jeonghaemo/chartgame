// app/api/ads/redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { providerToUrl } from "@/lib/ads";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "").toUpperCase();

  if (provider !== "COUPANG" && provider !== "NAVER") {
    return NextResponse.json({ ok: false, error: "BAD_PROVIDER" }, { status: 400 });
  }

  const target = providerToUrl(provider as "COUPANG" | "NAVER");
  if (!target) {
    return NextResponse.json({ ok: false, error: "MISSING_AFF_URL" }, { status: 500 });
  }

  // 👉 여기서는 하트 충전이나 DB 기록 없이 단순 이동만
  return NextResponse.redirect(target, { status: 302 });
}
