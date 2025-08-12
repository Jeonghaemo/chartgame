-- AlterTable
ALTER TABLE "Score" ADD COLUMN "returnPct" REAL;
ALTER TABLE "Score" ADD COLUMN "symbol" TEXT;

-- CreateIndex
CREATE INDEX "Score_userId_createdAt_idx" ON "Score"("userId", "createdAt");
