# Levelift — Shared Claude Code Project Instructions

> **Status:** Version 1 (MVP) · **Team:** Two developers, each using Claude Code · **Platform:** Responsive web app
>
> **Project name:** `Levelift` is the working name. The visual reference may say `RepQuest`; do not treat that as a confirmed rebrand. Keep brand text/config easy to change.

## 1. Product vision

Build a **social fitness kingdom-building game** in which real-world workouts produce in-game resources. Players use those resources to level up a 3D character and develop a personal kingdom, then compare progress with friends.

**Core gameplay loop:**

`Log workout → Receive Gold, Materials and XP → Upgrade character / build kingdom → Compare progress with friends → Repeat`

**Design principle:** The **3D character is the main visual of the home screen**. The kingdom is a separate, meaningful progression screen. This is a *building and friendly-competition game*, **not a combat or battle game**.

### Experience and visual direction

- Use the shared visual reference as inspiration: a large, central hero; sophisticated dark background; restrained warm-gold highlights; elegant typography; compact information panels.
- Character-first UI: the hero dominates the home screen, with minimal overlays for XP, resources, today's activity, and quick navigation.
- Responsive on desktop and mobile; usable without a high-end GPU.
- Initial 3D assets can be simplified / low-poly. **Do not block functionality on photorealistic assets** or custom animation pipelines.
- The application should feel like a game, not a conventional spreadsheet-style fitness dashboard.

## 2. V1 scope (required)

### A. Character hub

- Central interactive 3D character (simple rotate / inspect interaction is sufficient).
- Player level and XP progress.
- Gold and Materials balance.
- Basic character appearance / equipped outfit display; a small fixed set of options is enough.
- Summary of today's workout activity.
- Clear navigation to **Kingdom**, **Workouts**, and **Friends**.

### B. Workout and reward system

- Manual workout logging for **running, walking, cycling, and strength training**.
- Store workout type, date/time, duration, and activity-specific optional information (e.g., distance or sets).
- Show workout history.
- Award **Gold**, **Materials**, and **XP** using simple, centralised server-side rules.
- Start with transparent, configurable rewards and daily limits; never trust a client-provided reward amount.
- Prevent duplicate reward claims for the same workout.
- Use fictional, **non-redeemable** in-game currency only.

### C. Kingdom building

- One personal 3D island / small kingdom per player.
- Small fixed grid or predefined plots; users can view and place buildings.
- Start with **four functional building types** (e.g., Town Hall, House, Farm, Workshop). Add decoration or plot expansion only if time permits.
- Purchase, place, and upgrade buildings using resources.
- Building ownership, position, and upgrade level persist in the database.
- Display **Kingdom Score** calculated from owned buildings / upgrades.
- No free-roaming open world or real-time shared simulation.

### D. Friends and competition

- Authentication and persistent user profiles.
- Add friends (a simple username or invitation flow).
- View friends' profiles and **visit their kingdoms** in read-only mode.
- Weekly leaderboard based on **kingdom score gained during the week** (not merely lifetime total) and optionally weekly XP.
- Simple reactions are optional; do not let chat or social feeds delay V1.
- Respect privacy: activity details should not automatically become public to everyone. Start with friend-only sharing and clear visibility controls.

### E. Quality / release basics

- Validated inputs, loading / empty / error states, and mobile-responsive layouts.
- Database permissions so players cannot spend another player's resources, edit their buildings, or see data outside the intended visibility policy.
- Basic automated tests for reward calculations, purchasing, and permissions.
- Deploy a working beta to Vercel with Supabase as the backend.

## 3. Explicitly out of scope for V1

Do **not** implement without an explicit team decision:

- Combat, raids, armies, PvP battles, or attack mechanics.
- Real-time multiplayer worlds / live co-editing.
- Player trading, auctions, advanced resource supply chains.
- Apple Health, Strava, or wearable integrations.
- Complex guild alliances, seasonal territory wars, or elaborate quest trees.
- Photorealistic character creation, advanced rigging, or cinematic animations.
- Native iOS / Android apps or payments.

Daily / weekly quests, notifications, additional cosmetics, and more buildings are **stretch goals** only after the end-to-end V1 loop works.

## 4. Technology choices

| Layer | Choice |
| --- | --- |
| Web framework | Next.js + TypeScript |
| Styling | Tailwind CSS |
| 3D | React Three Fiber + Drei / Three.js |
| Auth, database, storage | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Source control | GitHub, pull requests, protected `main` |
| Coding assistance | Claude Code (both developers) |

Keep the stack small. Do not introduce other major frameworks, state libraries, ORMs, or services without a concrete reason and agreement.

## 5. Team responsibilities

> Each Claude Code session must know which developer it is working for. If the developer has not said so, ask before editing files.

### Developer A — Frontend / Game Visuals

**Owns:**
- Main character dashboard matching the supplied reference's composition and visual language.
- 3D character scene, camera / controls, basic equipment presentation.
- 3D kingdom scene, building models / placeholders, placement interactions.
- Workout, shop, friend, and leaderboard UI.
- Responsive design, loading states, feedback animations, and accessibility.

**Does not own:** database migrations, permission rules, or authoritative reward calculations.

### Developer B — Backend / Systems

**Owns:**
- Supabase authentication, schema, migrations, row-level security, and profile creation.
- Workout persistence and server-authoritative Gold / Materials / XP calculation.
- Economy transactions, purchases, upgrades, owned-building positions.
- Friends, kingdom-read permissions, leaderboard queries and weekly aggregation.
- Backend validation, idempotency, and system tests.

**Does not own:** 3D scene code or primary screen layouts.

### Shared responsibilities

- Agree on database and TypeScript/API contracts **before building connected features**.
- Review each other's pull requests, test integrations, resolve blockers.
- Maintain this document, acceptance criteria, and a short task board.
- Coordinate any edits to shared types, app routing, package dependencies, and Supabase migrations.

## 6. Repository structure and file ownership

One Next.js app. The split is by **file ownership**, not by separate apps. A Claude Code session must only edit files its developer owns. To change anything else, describe the needed change and let the owner make it.

```
Levelift/
├── CLAUDE.md, README.md, .env.example, .gitignore      SHARED
├── package.json, next.config.ts, tsconfig.json, …      SHARED (agree before adding dependencies)
├── public/models/                                      FRONTEND  3D assets (.glb)
├── src/
│   ├── middleware.ts                                   BACKEND   session refresh + redirect to /login (off in mock mode)
│   ├── app/                                            FRONTEND  pages and routes
│   │   ├── page.tsx                                              character hub
│   │   ├── login/  workouts/  kingdom/  friends/  leaderboard/
│   ├── components/                                     FRONTEND
│   │   ├── ui/  character/  kingdom/
│   ├── types/game.ts                                   SHARED    the API contract
│   ├── types/database.ts                               BACKEND   generated by `npm run db:types`, never edit by hand
│   ├── services/                                       BACKEND   real service functions
│   │   ├── index.ts                                              picks real or mock (NEXT_PUBLIC_USE_MOCKS)
│   │   ├── auth.ts  player.ts  workouts.ts  kingdom.ts  friends.ts   (server actions)
│   │   ├── mappers.ts                                            DB rows → contract types
│   │   └── mock/                                       FRONTEND  dev-only mock data
│   └── lib/
│       ├── supabase/                                   BACKEND   client.ts, server.ts, middleware.ts (session refresh)
│       ├── auth/                                       BACKEND   sign-up validation, auth error messages
│       └── rewards/                                    BACKEND   reward rules and calculation
├── supabase/
│   ├── config.toml                                     BACKEND   local Supabase settings
│   └── migrations/                                     BACKEND   schema, RLS, SQL functions
└── tests/                                              BACKEND   reward, purchase and permission tests
    └── db/                                                       database / RLS tests (need local Supabase)
```

**Rules:**

- UI code imports game data **only** from `@/services`. It never calls Supabase directly and never calculates rewards or prices.
- `src/types/game.ts` is the contract. Change it only in a small, dedicated PR reviewed by the other developer. Both `src/services/*` and `src/services/mock` must satisfy `GameService`.
- Shared files (SHARED above) are changed in small, separate PRs, never as a side effect of a feature.
- Purchases, upgrades and reward awards run as Postgres functions in `supabase/migrations/`, called with `supabase.rpc(...)`, so they are atomic and server-authoritative.
- Personal Claude Code settings (`.claude/settings.local.json`) and `.env.local` are git-ignored and never committed.

- Never edit an existing migration once it is merged. Change the schema with a new migration file (`npx supabase migration new <name>`), then run `npm run db:reset` and `npm run db:types`.

**Commands:** `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

**Local database (backend):** needs Docker. `npm run db:start` / `db:stop`, `npm run db:reset` (rebuild from migrations), `npm run db:types` (regenerate `src/types/database.ts`), `npm run test:db` (database and RLS tests). Put the values from `npx supabase status -o env` into `.env.local` and set `NEXT_PUBLIC_USE_MOCKS=false`.

**Frontend without Docker:** keep `NEXT_PUBLIC_USE_MOCKS=true`. The app then uses `src/services/mock` and never contacts Supabase; `npm test` skips the database tests.

## 7. Shared integration contracts

The frontend must access game data through typed, stable service functions rather than embedding reward or purchasing logic into UI components.

The function names and types live in `src/types/game.ts` (`GameService`). Current interface:

```ts
getCurrentPlayer(): Promise<PlayerProfile>;
getCharacter(): Promise<CharacterState>;
logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult>;
getWorkoutHistory(): Promise<Workout[]>;
getKingdom(userId?: string): Promise<KingdomState>;
purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult>;
upgradeBuilding(buildingId: string): Promise<UpgradeResult>;
getFriends(): Promise<FriendProfile[]>;
getWeeklyLeaderboard(): Promise<LeaderboardEntry[]>;
```

**Contract rules:**

- Use TypeScript interfaces / types shared by frontend and backend.
- Define clear inputs, return values, and error states; avoid implicit dependencies.
- Represent in-game currencies as **integers**.
- Purchases and upgrades must be **atomic**: verify ownership / funds and debit / update together in a database transaction (or equivalent server-controlled function).
- Reward formula and spending validation belong to trusted server-side code, not the browser.
- Design the frontend against mock responses when backend functions are not yet ready; swap in the real implementation without rewriting UI components.
- Never silently modify agreed contracts. Discuss breaking changes and update both sides together.

### Suggested initial entities

`profiles`, `characters`, `workouts`, `wallets`, `resource_transactions`, `kingdoms`, `building_definitions`, `owned_buildings`, `friendships`.

The backend owner can simplify these tables as appropriate; document the final schema. Weekly rankings can be derived from persistent, auditable score-change / building events rather than blindly trusting client totals.

## 8. Collaboration and Git rules

- **One shared GitHub repository** and one deployable Next.js app.
- `main` should always build and pass tests. **Never commit directly to `main`**.
- Use task-scoped branches such as `feat/character-hub`, `feat/workout-rewards`, `feat/kingdom-scene`, `feat/friends-leaderboard`. Avoid keeping two long-lived branches that drift apart.
- Open small pull requests. Include a short summary, test instructions, screenshots for UI changes, and any migration / environment changes.
- Review each other's work before merging. Rebase / pull from `main` frequently.
- Resolve file ownership before parallel work (see section 6). Avoid both Claude Code sessions editing the same files simultaneously.
- Store secrets in local `.env.local` and deployment environment settings. Commit only a safe `.env.example` with variable names, never credentials or service-role keys.
- Check in migrations, reusable assets (with valid licences), tests, and documentation.

### Instructions for either Claude Code session

1. Read this `CLAUDE.md` and inspect existing code before implementing anything.
2. Confirm which developer / task you are working for; stay within that owner’s responsibility unless asked otherwise.
3. Prefer the **smallest viable implementation** that advances the gameplay loop.
4. Preserve existing design and API contracts. Flag integration risks instead of changing another owner's code without coordination.
5. Make code understandable to two human maintainers: typed, modular, and documented where non-obvious.
6. After changes, run relevant formatting, type checks, tests, and a build where feasible. Report exactly what passed / failed.
7. Never claim functionality is complete unless it has actually been exercised or tested.
8. Do not fabricate workout data, synced health integrations, user accounts, or multiplayer behaviour in production. Use clearly marked mock data only in development.
9. Ask for alignment before adding a large new dependency, changing product scope, or making a breaking schema / API change.

## 9. Delivery plan (4–6 week target, adjust to actual progress)

| Period | Developer A: Frontend / 3D | Developer B: Backend / Systems | Joint milestone |
| --- | --- | --- | --- |
| Week 1 | Character hub layout, placeholder 3D avatar, navigation | Supabase setup, auth, schema, initial RLS | Two accounts can sign in; dashboard loads |
| Week 2 | Workout entry / history / reward feedback UI | Workout CRUD and trusted resource / XP awards | Log a workout and see persistent rewards |
| Week 3 | Small kingdom scene, building placement visuals | Purchases, upgrades, placements, transactions | Spend workout Gold to place a building |
| Week 4 | Friend profile / kingdom visit / leaderboard screens | Friends logic, read-only visits, weekly rankings | Two users can visit and compare kingdoms |
| Weeks 5–6 | Visual polish, responsive UX, accessibility | Permission checks, tests, data / performance fixes | Invite friends to a usable public beta |

**Development order:** prioritise a vertical slice over completing one entire system in isolation.

### First vertical slice (highest priority)

1. Sign in as a player.
2. See a basic hero and empty kingdom.
3. Log one workout.
4. Receive Gold, Materials and XP.
5. Spend Gold to buy a House.
6. See the House appear in 3D and stay there after refresh.

Once this works end-to-end, extend the visuals, buildings, and social features.

## 10. V1 definition of done

A release is ready when two real users can independently:

- Sign up / sign in and see their own character hub.
- Log a supported workout and receive the correct persistent rewards exactly once.
- See their Gold, Materials, XP, character level, and activity history.
- Purchase or upgrade a building and see it placed in their persistent 3D kingdom.
- Add each other as friends and visit one another's kingdoms without editing them.
- Compare **weekly kingdom growth** on a leaderboard.
- Use the primary experience on both desktop and mobile, without critical errors.
- Be protected from cross-account data edits and forged client currency amounts.

If a proposed feature does not help meet this checklist, treat it as a later version unless both developers explicitly reprioritise it.

## 11. Working session checklist

At the start of each Claude Code session:

1. Read `CLAUDE.md`, relevant source files, and the latest merged work. Confirm which developer you are working for and only edit files that developer owns (section 6).
2. State your current feature, files likely to change, and any dependency on the other developer.
3. Implement only the agreed slice.
4. Test it and summarise changed files, outcomes, and blockers.
5. Open a pull request for review; do not push directly to `main`.

**North star:** Every workout should create a **visible, satisfying change** in the player's hero or kingdom, and friends should have a compelling reason to return—without the game encouraging unhealthy exercise volume.
