/*
  Warnings:

  - A unique constraint covering the columns `[userId,dayKey,index]` on the table `AdWatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AdWatch_userId_dayKey_index_key" ON "AdWatch"("userId", "dayKey", "index");
