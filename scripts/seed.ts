import { prisma } from "@/lib/prisma";

async function main() {
  // 초기 유저/게임 등 필요시 작성
  console.log("No seed.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
