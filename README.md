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
cd ~/screen-sage && npm run dev
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

Your TMDB read access token is installed in `.env.local`, so quick-add autofills locally: type "Dune", get the poster, year, runtime, genres, and the franchise detected automatically. It's also already stored in Google Secret Manager for the live site.

---

## Part 3 — Going live on Google Cloud (~15 min of your time)

**Where everything lives**

- **The website** → Google Cloud Run, in your project **Screen Sage Studios** (`yggdrasil-476219`), region `us-central1`
- **The database + poster images** → Supabase (free hosted account)
- **Passwords and secret keys** → Google Secret Manager (never in a file, never in git)

**Already done for you ✅** Google APIs switched on · a locked-down account for the website that can only read its own secrets · a fresh production session key · the TMDB key.

Take breaks between steps — nothing here is time-sensitive.

### 3a. Make the Supabase project (~5 min)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub
2. **New project** → name it `screen-sage`
3. Make a **database password** → save it in your password manager right now (you need it in 3b)
4. Region: **East US (Ohio)** — closest to where Google runs the site
5. Click **Create** and wait ~2 minutes ☕

### 3b. Give it the database structure (~3 min)

Run these one at a time:

```bash
cd ~/screen-sage && npx supabase login
```

A browser opens → click **Authorize** → come back.

```bash
cd ~/screen-sage && npx supabase link
```

Pick `screen-sage` from the list, then type the database password from 3a.

```bash
cd ~/screen-sage && npx supabase db push
```

Type `y` if it asks. This creates every table plus the poster storage.

### 3c. Hand over the keys (~3 min)

Open the Supabase dashboard → **Project Settings → API Keys**. Then run:

```bash
cd ~/screen-sage && npm run setup:production
```

It asks five things, one at a time, and checks each answer:

1. Project URL — copy/paste
2. Publishable key — copy/paste
3. Secret key — copy/paste (**typing stays hidden**)
4. A new Desk password for the live site, twice (**hidden**, 12+ characters) — this is what guards your admin panel on the internet, so make it a strong one, not `sage-local`
5. Resend key — just press Enter to skip for now

### 3d. Deploy 🚀 (~5 min, mostly waiting)

```bash
cd ~/screen-sage && npm run deploy
```

When it prints **"Live at …"**, open that address. Then add `/desk` to the end and log in with the password from 3c.

### Later on

- **Ship changes:** `npm run deploy` again. That's the whole process.
- **Change a password or key:** `npm run setup:production`, then `npm run deploy`.
- **Newsletter sending:** make a free https://resend.com account → **API Keys** → create one → run `npm run setup:production` and paste it at step 5 → `npm run deploy`. Until you verify your own domain in Resend, it only delivers to your own email.
- **Your own domain:** once you have one, put `SITE_URL=https://yourdomain.com` in `deploy.env`, then ask Claude to map it in Cloud Run.

### What it costs

The site sleeps when nobody's visiting and wakes on the first request (a few seconds' delay), so a personal site should stay at or near **$0** on Google's free tiers. To be safe, set a budget alert: Google Cloud console → **Billing → Budgets & alerts → Create budget** → $5.

Supabase's free plan can **pause a project during long quiet stretches**. If the site ever shows a database error after weeks without visitors, open the Supabase dashboard and click **Restore**. The $25/month Pro plan avoids this entirely.

---

## Reference

### Environment variables

Locally, everything lives in `.env.local` (`.env.example` is the checklist). In production, non-secret settings live in `deploy.env` and secrets in Google Secret Manager — both written by `npm run setup:production`.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npx supabase start` / `stop` | local database up / down |
| `npx supabase db reset --local` | wipe local data, replay schema |
| `npx supabase db push` | push schema to the hosted project |
| `npm run build` | production build check |
| `npm run setup:production` | store/update production keys + passwords |
| `npm run deploy` | build in Google Cloud and ship to Cloud Run |
| `npm run lint` / `npx tsc --noEmit` | lint / type check |

### How scores roll up

- **Film** → its review's score
- **Season** → the season review's score; episode chips show each episode's score
- **Series average** → average of published season scores (falls back to episode scores)
- **Franchise average** → average of member titles' scores
- Sub-scores are always optional and display in the order you set in the Desk's Tags tab; a missing category simply doesn't appear.

### Scheduling

**Schedule** sets a publish time — the review goes live automatically when that time passes (the database policy makes it visible; no cron needed).

### Where things live

- `app/` — pages & API routes (`app/api/desk/*` is the private backend)
- `components/` — UI, `components/desk/` — the Sage Desk app
- `lib/` — Supabase clients, queries, TMDB, session auth
- `supabase/migrations/` — the database schema
- `proxy.ts` — the password gate in front of `/desk`
