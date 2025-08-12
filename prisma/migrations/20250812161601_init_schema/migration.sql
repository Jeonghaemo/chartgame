-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "gameBalance" INTEGER NOT NULL DEFAULT 10000000,
    "gamePosQty" INTEGER NOT NULL DEFAULT 0,
    "gamePosAvg" DECIMAL,
    "gamePosSymbol" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "gameBalance", "gamePosAvg", "gamePosQty", "gamePosSymbol", "id", "image", "name", "updatedAt") SELECT "createdAt", "email", "gameBalance", "gamePosAvg", "gamePosQty", "gamePosSymbol", "id", "image", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
