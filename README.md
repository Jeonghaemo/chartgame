# Chart Game

Next.js (App Router) + Auth.js (NextAuth v5) + Prisma (SQLite) + Google/Naver OAuth + Finnhub/AlphaVantage quote API adapters.

## Quick Start
```bash
cp .env.example .env.local
# Fill OAuth/API keys in .env.local
pnpm i        # or npm i / yarn
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
# http://localhost:3000
```

## What’s Included
- Google & Naver Login (Auth.js v5)
- Prisma SQLite for users/accounts/sessions
- Protected game page (`/game`) — requires login
- Leaderboard stored in DB and tied to user
- `/api/quote?symbol=TSLA` fetches from Finnhub (if FINNHUB_API_KEY present) else AlphaVantage (if ALPHAVANTAGE_API_KEY present)
- SWR-powered leaderboard and client session

## Environment
See `.env.example` for all variables. In production set `AUTH_SECRET` and `NEXTAUTH_URL` properly.
