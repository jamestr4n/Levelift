# Levelift

A social fitness kingdom-building game: real workouts earn Gold, Materials and XP to level up your hero and build your kingdom.

Next.js + TypeScript + Tailwind, Supabase, deployed on Vercel. See [CLAUDE.md](CLAUDE.md) for the full plan, folder ownership and team rules.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys, or keep NEXT_PUBLIC_USE_MOCKS=true
npm run dev                  # http://localhost:3000
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
