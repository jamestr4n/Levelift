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

**Expected advisor warnings:** `authenticated_security_definer_function_executable` (and one `anon_…` for `is_username_available`). These functions are the game's API on purpose: each checks who is calling and validates input, and players can't write tables directly (`tests/db/permissions.test.ts`). Any **other** WARN needs a look. `unused_index` notes are normal on a new database.

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

   **Never add the `service_role` / secret key to Vercel.** The app doesn't need it, and it bypasses every security rule. If mocks are left on, the production build fails on purpose.
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
