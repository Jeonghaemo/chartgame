import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;

// ⚠️ Prisma 사용이므로 Edge 금지
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // (권장) 캐시 회피