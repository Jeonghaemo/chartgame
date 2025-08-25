/*
  Warnings:

  - A unique constraint covering the columns `[gameId,ts]` on the table `BalanceSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startCash" INTEGER NOT NULL,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER,
    "maxTurns" INTEGER NOT NULL DEFAULT 60,
    "feeBps" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "returnPct" REAL,
    CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("code", "createdAt", "endIndex", "feeBps", "finishedAt", "id", "maxTurns", "returnPct", "startCash", "startIndex", "userId") SELECT "code", "createdAt", "endIndex", "feeBps", "finishedAt", "id", "maxTurns", "returnPct", "startCash", "startIndex", "userId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE INDEX "Game_userId_createdAt_idx" ON "Game"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_gameId_ts_key" ON "BalanceSnapshot"("gameId", "ts");
