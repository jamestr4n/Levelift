# Levelift — Shared Claude Code Project Instructions

> **Status:** Version 1 (MVP) · **Team:** Two developers, each using Claude Code · **Platform:** Responsive web app
>
> **Project name:** `Levelift` is the working name. The visual reference may say `RepQuest`; do not treat that as a confirmed rebrand. Keep brand text/config easy to change.

## Current status (updated 2026-11-24)

> Keep this section current. Update it in the same PR as any milestone, decision or deploy change.

**Where we are:** the backend for all of V1 is done and live on the hosted Supabase project. The frontend has done the hub, sign-in, workouts and kingdom. **Still to do:** the Friends and Leaderboard screens, and a test of the whole game against the real backend. The site is deployed on Vercel at https://levelift.vercel.app. All 17 PRs are merged and CI is green on `main`.

### V1 definition of done (section 10)

| Requirement | Backend | Frontend | Notes |
|---|---|---|---|
| Sign up / sign in, see own hub | ✅ | ✅ (#12, #15) | Email + password, username chosen at sign-up |
| Log a workout, rewards exactly once | ✅ | ✅ (#14) | Server-side rewards, caps, retry-safe |
| See Gold, Materials, XP, level, history | ✅ | ✅ (#12, #14) | |
| Buy / upgrade a building in the 3D kingdom | ✅ | ✅ (#16) | Shop prices are display copies (see decisions) |
| Add friends, visit their kingdom read-only | ✅ (#10) | ❌ | `/friends` is a placeholder. There's no route yet to open a friend's kingdom: `getKingdom(friendId)` exists and returns `canEdit: false`, and `KingdomView` already handles `canEdit` |
| Compare weekly growth on a leaderboard | ✅ (#10) | ❌ | `/leaderboard` is a placeholder. `getWeeklyLeaderboard()` is ready |
| Works on desktop and mobile | n/a | ⚠️ | Responsive layout built, but not yet checked on real phones |
| Protected from cross-account edits and forged currency | ✅ | n/a | Row-level security, plus permission sweep tests over every table and function |

### Deployment

| Piece | State |
|---|---|
| Hosted Supabase project `levellift` (ref `xukrfsedfbhfmupycjcm`, eu-west-1) | ✅ All 5 migrations pushed 2026-11-24. Advisors show only the expected warnings (see `docs/DEPLOY.md`) |
| Supabase auth settings | ✅ **Confirm email: OFF** confirmed 11-24: new sign-ups on the live site go straight to the hub. Minimum password length 8. Set by hand in the dashboard |
| Vercel | ✅ Live at **https://levelift.vercel.app** (project `levelift`, team LL). Deploys `main` to production; every PR gets a preview. The 3 env vars from `docs/DEPLOY.md` §4 are set for Production and Preview |
| Supabase Site URL / Redirect URLs | ⏳ Backend to set both to `https://levelift.vercel.app` (`docs/DEPLOY.md` §3) |
| Custom email (SMTP) | ⏸ Postponed: needs a domain we own. Needed before opening beyond close friends |
| Branch protection on `main` (require CI) | ⏳ Recommended, not yet turned on |

### What's next, in priority order

1. **Frontend:** Friends screen (add by username, incoming/outgoing requests, friends list) and **visiting a friend's kingdom**, e.g. `/kingdom?user=<id>`, reusing `KingdomView` with `canEdit: false`.
2. **Frontend:** Leaderboard screen.
3. **Both:** test the whole game against **local Supabase** (`NEXT_PUBLIC_USE_MOCKS=false`) with two accounts, using the checklist in `docs/DEPLOY.md` §5. Until now, the UI has only been built against the mock.
4. ~~**Frontend (repo owner):** deploy to Vercel.~~ ✅ 11-24. **Backend:** set Site URL and Redirect URLs. Smoke test (11-24): sign-up, workout rewards (paid once on double-click), buying a House and phone layout pass on the live site; the friends and leaderboard steps wait for those screens to reach `main`.
5. **Both:** check on real phones, then invite friends.

### Open decisions (agree, then record below)

- **Real numbers:** reward rates, daily caps, level curve, building prices and scores are all placeholders.
- **`getBuildingDefinitions()`:** should we add it to the contract? Then the shop reads prices from the database instead of `src/components/kingdom/catalog.ts`, which has a TODO for this. Backend can add it.
- **Error style:** should `logWorkout`, `purchaseBuilding` and `upgradeBuilding` switch from throwing to `ActionResult` (see section 7)? Today their error codes are lost in production; `errorMessage()` falls back to a generic message.
- **Domain and custom email:** needed before a wider launch.

### Decisions log

| Date | Decision |
|---|---|
| 11-23 | Local Supabase in Docker for backend development. The frontend uses the mock (`NEXT_PUBLIC_USE_MOCKS=true`) and needs no Docker. |
| 11-23 | Email + password sign-in; a unique username (3–20 chars, `a-z 0-9 _`, stored lowercase) chosen at sign-up; password at least 8 characters. |
| 11-23 | Rewards are calculated **only** in the database function `log_workout()`. The TypeScript copy in `src/lib/rewards/` is for previews and tests, and a DB test fails if the two differ. Daily caps go by the UTC day a workout is *logged*; workouts can be back-dated at most 7 days; at most 120 rewarded minutes per workout and 20 workouts per day. |
| 11-23 | The level curve is `100 × level` XP to the next level, max level 50. `xp` is progress within the current level. |
| 11-23 | Building prices and scores are the frontend mock's numbers. The database (`building_definitions`) is the source of truth. A kingdom has exactly one Town Hall (free, so it can't be bought). Each new kingdom starts with a Town Hall at (2,2) on a 5×5 grid. |
| 11-23 | Friends need a request **and** an acceptance (privacy). Friends can see each other's kingdom, buildings and character, but never their wallet or workout details. The leaderboard shows only weekly totals. |
| 11-23 | The weekly leaderboard is you plus your friends, ranked by Kingdom Score **gained** this week, then weekly XP. Weeks start Monday 00:00 UTC. The starting Town Hall doesn't count. |
| 11-23 | Reading functions throw `GameError`. **New** actions that can fail visibly return `ActionResult` (sign-in functions, and friend requests since #10). |
| 11-24 | Friends-only beta runs with **Confirm email off** (no domain yet). The confirmation route and template are ready for when it's turned on. |

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
├── .github/workflows/ci.yml                            SHARED    CI: must pass before merging
├── docs/DEPLOY.md                                      SHARED    how to deploy (Supabase + Vercel)
├── package.json, next.config.ts, tsconfig.json, …      SHARED (agree before adding dependencies)
├── public/models/                                      FRONTEND  3D assets (.glb)
├── src/
│   ├── middleware.ts                                   BACKEND   session refresh + redirect to /login (off in mock mode)
│   ├── app/                                            FRONTEND  pages and routes
│   │   ├── auth/confirm/route.ts                       BACKEND   email confirmation link handler
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
│   │   ├── session.ts                                            server-only helpers (requireUser, loadPlayer)
│   │   └── mock/                                       FRONTEND  dev-only fake backend (store.ts state, actions.ts server actions)
│   └── lib/
│       ├── supabase/                                   BACKEND   client.ts, server.ts, middleware.ts (session refresh)
│       ├── auth/                                       BACKEND   sign-up validation, auth error messages
│       ├── workouts/                                   BACKEND   workout input rules (safe to use in forms)
│       └── rewards/                                    BACKEND   TS mirror of reward + level rules (preview/tests; DB decides)
├── supabase/
│   ├── config.toml                                     BACKEND   local Supabase settings (NOT used by the hosted project)
│   ├── templates/                                      BACKEND   auth email templates
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

- Every new table or database function must be added to `tests/db/permissions.test.ts`, which states who may read or call it. The test fails until you do.
- Never edit an existing migration once it is merged. Change the schema with a new migration file (`npx supabase migration new <name>`), then run `npm run db:reset` and `npm run db:types`.

**Commands:** `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. GitHub Actions (`.github/workflows/ci.yml`) runs all of these plus the database tests on every pull request; keep it green.

**Local database (backend):** needs Docker. `npm run db:start` / `db:stop`, `npm run db:reset` (rebuild from migrations), `npm run db:types` (regenerate `src/types/database.ts`), `npm run test:db` (database and RLS tests), `npm run db:advisors` (Supabase security and performance checks), `npm run db:push` (apply migrations to the hosted project; see `docs/DEPLOY.md`). Put the values from `npx supabase status -o env` into `.env.local` (`API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` as `SUPABASE_SERVICE_ROLE_KEY` for test setup only) and set `NEXT_PUBLIC_USE_MOCKS=false`.

**Frontend without Docker:** keep `NEXT_PUBLIC_USE_MOCKS=true`. The app then uses `src/services/mock` and never contacts Supabase; `npm test` skips the database tests.

## 7. Shared integration contracts

The frontend must access game data through typed, stable service functions rather than embedding reward or purchasing logic into UI components.

The function names and types live in `src/types/game.ts` (`GameService`); that file is the source of truth. Import everything from `@/services`. Current interface, with how each one reports errors:

```ts
// Auth: return AuthResult { ok, needsEmailConfirmation } | { ok: false, code, message }
signUp(input: SignUpInput): Promise<AuthResult>;
signIn(input: SignInInput): Promise<AuthResult>;
signOut(): Promise<void>;
isUsernameAvailable(username: string): Promise<boolean>;

// Reads: throw GameError (NOT_AUTHENTICATED, NOT_FOUND, …)
getCurrentPlayer(): Promise<PlayerProfile>;
getCharacter(): Promise<CharacterState>;
getWorkoutHistory(): Promise<Workout[]>;                 // newest first, max 100
getKingdom(userId?: string): Promise<KingdomState>;      // a friend's id gives canEdit: false; non-friends get NOT_FOUND
getFriends(): Promise<FriendProfile[]>;
getFriendRequests(): Promise<FriendRequest[]>;           // incoming + outgoing pending
getWeeklyLeaderboard(): Promise<LeaderboardEntry[]>;     // me + friends, ranked

// Game actions: throw GameError (see the open decision about switching to ActionResult)
logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult>;          // INVALID_INPUT, RATE_LIMITED
purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult>; // INSUFFICIENT_FUNDS, PLOT_OCCUPIED, INVALID_INPUT
upgradeBuilding(buildingId: string): Promise<UpgradeResult>;            // INSUFFICIENT_FUNDS, MAX_LEVEL, NOT_FOUND

// Friend actions: return ActionResult<T> = { ok: true, data } | { ok: false, code, message }
sendFriendRequest(username: string): Promise<ActionResult<{ status: "pending" | "accepted" }>>;
respondToFriendRequest(requestId: string, accept: boolean): Promise<ActionResult<{ status: "accepted" | "declined" }>>;
removeFriend(userId: string): Promise<ActionResult<null>>;               // also cancels a pending request
```

**Errors:** in production, Next.js strips the code and message from errors *thrown* by server actions, so thrown errors reach the UI as a generic failure. `ActionResult` and `AuthResult` keep `code` and a player-safe `message`. Prefer them for any new action whose failure the player needs to understand.

**Workouts:** create `clientRequestId` with `crypto.randomUUID()` **once per submission** and reuse it on retry; a retry returns the original result and doesn't pay again. Disable action buttons (especially *Upgrade*) while a request is pending.

**Contract rules:**

- Use TypeScript interfaces / types shared by frontend and backend.
- Define clear inputs, return values, and error states; avoid implicit dependencies.
- Represent in-game currencies as **integers**.
- Purchases and upgrades must be **atomic**: verify ownership / funds and debit / update together in a database transaction (or equivalent server-controlled function).
- Reward formula and spending validation belong to trusted server-side code, not the browser.
- Design the frontend against mock responses when backend functions are not yet ready; swap in the real implementation without rewriting UI components.
- Never silently modify agreed contracts. Discuss breaking changes and update both sides together.

### Database (implemented)

Tables: `profiles`, `characters`, `wallets`, `kingdoms`, `building_definitions`, `owned_buildings`, `workouts`, `resource_transactions` (audit log of every Gold, Materials and XP change), `friendships`, and `kingdom_score_events` (feeds the weekly leaderboard). Every change to game state goes through a database function: `log_workout`, `purchase_building`, `upgrade_building`, `send_friend_request`, `respond_to_friend_request` and `remove_friend`. Players can't write tables directly. The full definitions are in `supabase/migrations/`.

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

✅ done · ⏳ in progress / to do. Details are in **Current status** at the top.

| Period | Developer A: Frontend / 3D | Developer B: Backend / Systems | Joint milestone |
| --- | --- | --- | --- |
| Week 1 | ✅ Character hub layout, placeholder 3D avatar, navigation | ✅ Supabase setup, auth, schema, initial RLS | Two accounts can sign in; dashboard loads |
| Week 2 | ✅ Workout entry / history / reward feedback UI | ✅ Workout CRUD and trusted resource / XP awards | Log a workout and see persistent rewards |
| Week 3 | ✅ Small kingdom scene, building placement visuals | ✅ Purchases, upgrades, placements, transactions | Spend workout Gold to place a building |
| Week 4 | ⏳ Friend profile / kingdom visit / leaderboard screens | ✅ Friends logic, read-only visits, weekly rankings | Two users can visit and compare kingdoms |
| Weeks 5–6 | ⏳ Visual polish, responsive UX, accessibility | ✅ Permission checks, tests, data / performance fixes; hosted DB pushed | Invite friends to a usable public beta |

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
