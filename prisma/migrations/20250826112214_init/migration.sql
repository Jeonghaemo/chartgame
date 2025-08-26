-- AlterTable
ALTER TABLE "BalanceSnapshot" ADD COLUMN "avgPrice" REAL;
ALTER TABLE "BalanceSnapshot" ADD COLUMN "history" TEXT;
ALTER TABLE "BalanceSnapshot" ADD COLUMN "turn" INTEGER;

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
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "returnPct" REAL,
    CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("code", "createdAt", "endIndex", "feeBps", "finishedAt", "id", "maxTurns", "returnPct", "startCash", "startIndex", "userId") SELECT "code", "createdAt", "endIndex", "feeBps", "finishedAt", "id", "maxTurns", "returnPct", "startCash", "startIndex", "userId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE INDEX "Game_userId_createdAt_idx" ON "Game"("userId", "createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "capital" INTEGER NOT NULL DEFAULT 10000000,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "maxHearts" INTEGER NOT NULL DEFAULT 5,
    "lastRefillAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeGameId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_activeGameId_fkey" FOREIGN KEY ("activeGameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("capital", "createdAt", "email", "emailVerified", "hearts", "id", "image", "lastRefillAt", "maxHearts", "name", "updatedAt") SELECT "capital", "createdAt", "email", "emailVerified", "hearts", "id", "image", "lastRefillAt", "maxHearts", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_activeGameId_key" ON "User"("activeGameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
