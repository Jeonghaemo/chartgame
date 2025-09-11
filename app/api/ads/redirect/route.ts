// app/api/ads/redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { providerToUrl, Provider } from "@/lib/ads";

const ALLOWED: Set<Provider> = new Set([
  "COUPANG",
  "NAVER",
  "SKYSCANNER",
  "AGODA",
  "ALIEXPRESS",
  "TRIPDOTCOM",
  "AMAZON",
  "KLOOK",
  "OLIVEYOUNG",
]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "").toUpperCase() as Provider;

  if (!ALLOWED.has(provider)) {
    return NextResponse.json({ ok: false, error: "BAD_PROVIDER" }, { status: 400 });
  }

  const target = providerToUrl(provider);
  if (!target) {
    return NextResponse.json({ ok: false, error: "MISSING_AFF_URL" }, { status: 500 });
  }

  // 광고 이동만 (보상 없음)
  return NextResponse.redirect(target, { status: 302 });
}
