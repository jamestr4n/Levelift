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
npx supabase login                         # opens the browser
npx supabase link --project-ref <ref>      # asks for the database password
npm run db:push                            # applies every migration in supabase/migrations/
npx supabase db advisors --remote          # security + performance check; should report no WARN
```

`db:push` lists the migrations before applying them. Check that the list is what you expect.

## 3. Configure sign-in (Supabase dashboard)

The local settings in `supabase/config.toml` **don't** apply to the hosted project. Set these by hand:

| Where (Authentication → …) | Setting |
|---|---|
| **URL Configuration** | **Site URL:** your Vercel address, e.g. `https://levelift.vercel.app` (fill in after section 4) |
| | **Redirect URLs:** `https://levelift.vercel.app/**` and `http://localhost:3000/**` |
| **Sign In / Providers → Email** | **Confirm email:** on. **Minimum password length:** 8 |
| **Emails → Templates → Confirm signup** | **Subject:** `Confirm your Levelift account`. **Body:** paste the contents of `supabase/templates/confirmation.html` |
| **Emails → SMTP Settings** | **Required for a public beta.** Supabase's built-in email sender only sends to your own team and allows very few emails per hour. Set up a custom SMTP provider (for example Resend, Postmark or Amazon SES) so friends get their confirmation emails. |

The confirmation link goes to `/auth/confirm` on your site, which signs the player in and opens the app.

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
2. From an up-to-date `main`: `npm run db:push`.
3. Run `npx supabase db advisors --remote` again.

Push the migration **before or together with** the app change that needs it. Never edit a migration that has already been pushed; add a new one.
