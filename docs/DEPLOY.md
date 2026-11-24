# Deploying the Levelift beta

How to put Levelift online with a hosted Supabase database and Vercel. Do it once, together. Allow about an hour.

**Who does what:** the backend developer sets up Supabase (sections 1–3). Whoever owns the GitHub repository sets up Vercel (section 4), because Vercel needs access to the repo.

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Name it `levelift`, choose the region closest to your players (for the UK, **London**), and generate a strong database password. **Save that password in a password manager**; you need it in step 2.
3. When the project is ready, note the **project ref**: the `xxxxxxxx` in `https://supabase.com/dashboard/project/xxxxxxxx`.

> On the free plan, projects pause after about a week with no activity. Open the dashboard to wake one up.

## 2. Push the database

From the repository root, on an up-to-date `main`:

```bash
npx supabase login                          # opens the browser
npx supabase link --project-ref <ref>
npx supabase db push --remote --dry-run     # shows which migrations would be applied
npm run db:push                             # applies them (supabase db push --remote)
npx supabase db advisors --remote --level info
```

Always pass `--remote`. Without it, this Supabase CLI version targets your **local** database.

**Expected advisor warnings:** `authenticated_security_definer_function_executable` (and one `anon_…` for `is_username_available`). These functions are the game's API on purpose: each checks who is calling and validates input, and players can't write tables directly (`tests/db/permissions.test.ts`). Any **other** WARN needs a look. `unused_index` notes are normal on a new database. The INFO note `rls_enabled_no_policy` on `strava_connections` is intended: only the server may touch that table.

## 3. Configure sign-in (Supabase dashboard)

The local settings in `supabase/config.toml` **don't** apply to the hosted project. Set these by hand:

| Where (Authentication → …) | Setting |
|---|---|
| **URL Configuration** | **Site URL:** your Vercel address, e.g. `https://levelift.vercel.app` (fill in after section 4) |
| | **Redirect URLs:** `https://levelift.vercel.app/**` and `http://localhost:3000/**` |
| **Sign In / Providers → Email** | **Minimum password length:** 8. **Confirm email:** see below |

### Email confirmation: pick one

**A. Friends-only beta, no domain (current setup).** Turn **Confirm email** off. No emails are sent and players can play straight after signing up. Email addresses aren't checked, which is fine for an invite-only group.

**B. Wider launch.** You need a domain you own (about £8–12 a year). Then:

1. Set up an email provider such as Resend: add and verify your domain (DNS records at your domain registrar), then create an API key.
2. **Emails → SMTP Settings:** turn on custom SMTP. Host `smtp.resend.com`, port `465`, username `resend`, password = the API key, sender `noreply@<your-domain>`, name `Levelift`.
3. **Emails → Templates → Confirm signup** (locked until custom SMTP is set): subject `Confirm your Levelift account`, body = contents of `supabase/templates/confirmation.html`.
4. Turn **Confirm email** on.

The confirmation link goes to `/auth/confirm` on your site, which signs the player in and opens the app. Supabase's built-in sender only emails members of your Supabase organisation, so it can't be used for real players.

## 4. Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub, then **Add New → Project** and import the `Levelift` repository. Vercel detects Next.js automatically.
2. Under **Environment Variables**, add these for **Production** and **Preview**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → the **anon / publishable** key |
   | `NEXT_PUBLIC_USE_MOCKS` | `false` |

   The `service_role` / secret key bypasses every security rule. Add it **only** when setting up Strava (section 7), and then **only for Production**, never Preview. If mocks are left on, the production build fails on purpose.
3. Click **Deploy**. When it finishes, copy the site address into the Supabase **Site URL** and **Redirect URLs** (section 3).

From then on, every merge to `main` redeploys automatically, and every pull request gets a preview link.

## 5. Smoke test with two real accounts

Use two different email addresses, for example one each.

- [ ] Opening the site while signed out sends you to `/login`.
- [ ] Sign up: the confirmation email arrives, and the link signs you in.
- [ ] Log a workout: Gold, Materials and XP go up and are still there after a refresh.
- [ ] Logging the same workout again (or double-clicking) doesn't pay twice.
- [ ] Buy a House: Gold goes down, and the House is still there after a refresh.
- [ ] Send a friend request from one account and accept it on the other.
- [ ] Each of you can visit the other's kingdom, but can't buy or upgrade anything there.
- [ ] The weekly leaderboard shows both of you.
- [ ] Everything works on a phone.

## 6. Shipping database changes later

1. Merge the pull request with the new migration (CI must be green).
2. From an up-to-date `main`: `npx supabase db push --remote --dry-run`, check the list, then `npm run db:push`.
3. Run `npx supabase db advisors --remote --level info` again (see the expected warnings in section 2).

Push the migration **before or together with** the app change that needs it. Never edit a migration that has already been pushed; add a new one.

## 7. Strava (optional)

Lets players connect Strava so runs, walks, rides and weight training are imported automatically. Without these settings the app works as before and hides the Connect button.

### Create the Strava app (once)

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and create an app. Use `https://levelift.vercel.app` as the **Website** and set **Authorization Callback Domain** to `levelift.vercel.app`. Strava always allows `localhost` too.
2. Note the **Client ID** and **Client Secret**.
3. **Athlete capacity:** a new app can be connected by **1** athlete (you). In the same settings page you can raise it to **10**. Beyond 10, Strava has to review the app (screenshots of the Connect button and where Strava data appears). There's no guarantee they'll approve it, so check before a wider launch.

### Vercel environment variables (Production only)

| Name | Value |
|---|---|
| `STRAVA_CLIENT_ID` | from the Strava app |
| `STRAVA_CLIENT_SECRET` | from the Strava app |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | any random string, e.g. `openssl rand -hex 16` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **secret / service_role** key |

The service-role key is used only by server code in `src/lib/strava` (through `src/lib/supabase/admin.ts`), for webhooks and for the token table that players can't read. Don't add it to Preview: preview URLs can't use Strava anyway, because they're not the callback domain. Redeploy after adding the variables.

### Create the webhook subscription (once, after the deploy)

Strava allows one subscription per app. It calls our URL once to check the verify token, so the deploy with the variables above must be live first.

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://levelift.vercel.app/api/strava/webhook \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
# -> {"id": 123}. To check later:
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=$STRAVA_CLIENT_ID -d client_secret=$STRAVA_CLIENT_SECRET
```

### Local development

Put the same four variables in `.env.local`. For the service-role key, use the **local** one from `npx supabase status -o env`. Connect works on `http://localhost:3000`. Strava can't reach localhost with webhooks, so use **Sync now** (or reconnect) to import.

### How it behaves

- When a player connects, their last 7 days are imported. After that, each new activity is imported by the webhook a few seconds after it's saved on Strava. **Sync now** imports the last 7 days again (at most once a minute).
- Imported workouts use the same rules as logged ones (rates, daily caps, the 7-day limit, 20 workouts a day). Each activity pays once, to one account.
- Run, Trail Run, Virtual Run → running. Walk, Hike → walking. Ride, Mountain Bike, Gravel, Virtual Ride → cycling. Weight Training, Crossfit → strength. Other sports, including e-bike rides, are skipped.
- An activity that overlaps a workout the player already has is skipped, so a run logged by hand and also recorded on Strava pays once. (The reverse isn't blocked yet: logging by hand a run that was already imported still pays.)
- Edited or deleted Strava activities don't change rewards already paid.
- Disconnecting, or revoking access on Strava, deletes the stored tokens. Imported workouts stay.

### Smoke test

- [ ] Connect Strava: you return to Workouts and recent activities appear as Strava workouts.
- [ ] Record or add a short activity on Strava: it appears within a minute without pressing anything.
- [ ] Sync now: nothing is paid twice.
- [ ] Disconnect: the button changes back to Connect, and the app is gone from Strava → Settings → My Apps.

