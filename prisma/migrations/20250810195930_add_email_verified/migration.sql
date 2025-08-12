/*
  Warnings:

  - You are about to drop the column `at` on the `Score` table. All the data in the column will be lost.
  - You are about to drop the column `streak` on the `Score` table. All the data in the column will be lost.
  - Added the required column `value` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Score" ("id", "userId") SELECT "id", "userId" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
