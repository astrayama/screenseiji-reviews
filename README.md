# SCREEN SAGE ✦

One critic, every screen. A fully functional review site — dusk-glass skin, amber warmth — built from the Claude Design wireframes (home 4a + every screen).

**What's inside**

- **Public site** — mood-first home with featured pick + "Now Reviewing" rail, film review posts (verdict count-up, optional sub-scores, spoiler-free body, blurred spoiler zone), franchise hubs, series hubs with season accordions, season pages with inline episode reviews, filterable archive, lists & rankings, instant search overlay (↑↓ + Enter), about page, RSS feed, sitemap, Review/BreadcrumbList/Person schema for SEO.
- **Sage Desk** (`/desk`) — private, password-gated, noindex, with a brute-force brake on the login. Quick-add titles from TMDB (metadata, posters, genres, and franchises autofill) or add manually, write/schedule/publish reviews, manage the **Library** (edit any title, swap posters, nest titles into franchises and reorder them, delete things), manage tags & sub-score categories, curate the Now Reviewing rail and lists, set your About identity (name, tagline, bio, photo), see 30-day view stats, manage subscribers, and send newsletter dispatches.
- **Backend** — Supabase (Postgres + storage) with row-level security: drafts are invisible to the public at the database level. Newsletter sending via Resend. No dummy data — the site starts empty and fills as you write.

---

## Part 1 — Run it on your Mac (10 minutes)

You already have everything installed (Node, Docker). Do these in order:

**1. Start Docker Desktop** (whale icon in Applications — skip if already running)

**2. Start the local database**

```bash
cd ~/screen-sage && npx supabase start
```

**3. Start the site**

```bash
cd ~/screen-sage && npm run dev -- --port 3210
```

**4. Open these two tabs**

- Site: http://localhost:3210
- Sage Desk: http://localhost:3210/desk — the local password is `sage-local` (it's in `.env.local`, change it whenever)

**5. Write your first review**

1. In the Desk, click **Tags** → make a couple of moods (Cozy, Melancholy, Feral…) — pick their pastel colors
2. Still in Tags: add sub-score categories you'll ever want (Cinematography, Music & Score, Acting, VFX…)
3. Click **Write** → "＋ add manually" (or quick-add, once you have a TMDB key — Part 2) → create the film
4. Toggle its tags, set the score, add sub-scores, write the verdict + body → **Publish** → **Feature on home**
5. Refresh the site. It's alive. ✦

> When you're done for the day: `npx supabase stop` (keeps your data), and Ctrl-C the dev server.

---

## Part 2 — The TMDB key ✅ already done

Your TMDB read access token is installed in `.env.local`, so quick-add autofills locally: type "Dune", get the poster, year, runtime, genres, and the franchise detected automatically.

**One thing to remember for Part 3:** when you set up Vercel, paste the same token as the `TMDB_API_KEY` environment variable (it's in `~/screen-sage/.env.local` if you need to copy it again).

---

## Part 3 — Going live (free, ~30 min total)

Three accounts, all free tier, all "Sign in with GitHub" (make a GitHub account first at https://github.com/signup if you don't have one). Take breaks between steps — nothing here is time-sensitive.

### 3a. Push the code to GitHub

```bash
cd ~/screen-sage && git add -A && git commit -m "Screen Sage"
```

1. Go to https://github.com/new → name it `screen-sage` → **Private** → Create
2. Follow the "push an existing repository" commands GitHub shows you (two lines, copy-paste into Terminal)

### 3b. Supabase (the database)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub
2. **New project** → name `screen-sage` → set a database password (save it in your password manager!) → region closest to you → Create
3. Wait ~2 min for it to provision ☕
4. Link and push your schema from Terminal:

```bash
cd ~/screen-sage && npx supabase login
```

```bash
cd ~/screen-sage && npx supabase link
```

   (pick the `screen-sage` project when it asks, enter the DB password)

```bash
cd ~/screen-sage && npx supabase db push
```

5. Collect three values from the dashboard — **Project Settings → API Keys**:
   - Project URL (like `https://abcdefgh.supabase.co`)
   - **Publishable** key (starts `sb_publishable_`)
   - **Secret** key (starts `sb_secret_`) — this one is sensitive, never share it

### 3c. Resend (the newsletter)

1. Go to https://resend.com → sign up with GitHub
2. **API Keys** → **Create API Key** → copy it (starts `re_`)
3. **Heads-up:** until you verify a domain, Resend only delivers to *your own* email address — perfect for testing. When you're ready for real subscribers: **Domains → Add Domain**, add the DNS records it shows to wherever your domain lives, then set `NEWSLETTER_FROM` to something like `Screen Sage <dispatches@yourdomain.com>`.

### 3d. Vercel (the hosting)

1. Go to https://vercel.com → sign up with GitHub
2. **Add New → Project** → Import `screen-sage`
3. Before clicking Deploy: open **Environment Variables** and add these (from your notes above):

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` |
| `DESK_PASSWORD` | invent a strong one — this guards your Desk |
| `SESSION_SECRET` | run `openssl rand -hex 32` in Terminal, paste the output |
| `TMDB_API_KEY` | your TMDB key |
| `RESEND_API_KEY` | `re_…` |
| `NEWSLETTER_FROM` | `Screen Sage <onboarding@resend.dev>` (until you verify a domain) |
| `SITE_URL` | your Vercel URL, e.g. `https://screen-sage.vercel.app` (add it after the first deploy, then redeploy) |

4. **Deploy** 🚀
5. After it builds: visit `your-url/desk`, speak the word, and publish from anywhere.

To ship changes later: `git add -A && git commit -m "…" && git push` — Vercel redeploys automatically.

---

## Reference

### Environment variables

Everything lives in `.env.local` locally, and in Vercel's Environment Variables in production. `.env.example` is the checklist.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev -- --port 3210` | dev server |
| `npx supabase start` / `stop` | local database up / down |
| `npx supabase db reset --local` | wipe local data, replay schema |
| `npx supabase db push` | push schema to the hosted project |
| `npm run build` | production build check |
| `npm run lint` / `npx tsc --noEmit` | lint / type check |

### How scores roll up

- **Film** → its review's score
- **Season** → the season review's score; episode chips show each episode's score
- **Series average** → average of published season scores (falls back to episode scores)
- **Franchise average** → average of member titles' scores
- Sub-scores are always optional and display sorted high → low; a missing category simply doesn't appear.

### Scheduling

**Schedule** sets a publish time — the review goes live automatically when that time passes (the database policy makes it visible; no cron needed).

### Where things live

- `app/` — pages & API routes (`app/api/desk/*` is the private backend)
- `components/` — UI, `components/desk/` — the Sage Desk app
- `lib/` — Supabase clients, queries, TMDB, session auth
- `supabase/migrations/` — the database schema
- `proxy.ts` — the password gate in front of `/desk`
