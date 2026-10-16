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

Your TMDB read access token is installed in `.env.local`, so quick-add autofills locally: type "Dune", get the poster, year, runtime, genres, and the franchise detected automatically. It's also set on the live site.

---

## Part 3 — It's live ✅

**https://reviews.screenseiji.com**

| Piece | Where it lives |
|---|---|
| The website | Vercel, project `screen-sage-reviews` |
| The database + poster images | Supabase, project `screen-sage-reviews` |
| Keys and passwords | Vercel environment variables (never in a file, never in git) |
| The domain | `screenseiji.com` at Namecheap, `reviews` pointed at Vercel |

### Putting changes live

```bash
cd ~/screen-sage && npm run deploy
```

That's it. Takes a couple of minutes.

### Moving local work to the live site

`npx supabase db push` only sends the table *structure*. To send what you've actually written — reviews, titles, tags, settings — run:

```bash
cd ~/screen-sage && npm run push:data
```

It asks for your Supabase database password and refuses to run if the live site already has reviews, so it can't overwrite anything.

### Changing a password or key

```bash
cd ~/screen-sage && npm run setup:production
```

Press Enter to skip any line you don't want to change, then `npm run deploy`.

### Newsletter sending

Make a free https://resend.com account → **API Keys** → create one → run `npm run setup:production`, paste it at the Resend prompt → `npm run deploy`. Until you verify your own domain in Resend, it only delivers to your own email address.

### What it costs

Vercel's free tier covers a personal site, and Supabase's free tier covers the database. Supabase can **pause a free project during long quiet stretches** — if the site ever shows a database error after weeks without visitors, open the Supabase dashboard and click **Restore**.

---

## Reference

### Environment variables

Locally, everything lives in `.env.local` (`.env.example` is the checklist). In production everything lives in Vercel's environment variables, written by `npm run setup:production`.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npx supabase start` / `stop` | local database up / down |
| `npx supabase db reset --local` | wipe local data, replay schema |
| `npx supabase db push` | push schema to the hosted project |
| `npm run build` | production build check |
| `npm run setup:production` | update live keys + passwords |
| `npm run push:data` | copy local reviews up to the live database |
| `npm run deploy` | ship to Vercel |
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
