BEGIN;

TRUNCATE "BalanceSnapshot", "Score", "Game" RESTART IDENTITY CASCADE;

UPDATE "User"
SET "capital" = 10000000,
    "hearts"  = 5,
    "updatedAt" = NOW();

COMMIT;