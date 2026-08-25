-- SCREEN SAGE schema
create extension if not exists citext;

-- ========== franchises ==========
create table public.franchises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  tmdb_collection_id integer unique,
  created_at timestamptz not null default now()
);

-- ========== titles (films & series) ==========
create table public.titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('film','series')),
  name text not null,
  year integer,
  runtime_minutes integer,
  synopsis text,
  poster_url text,
  status_text text,
  franchise_id uuid references public.franchises(id) on delete set null,
  franchise_order integer,
  tmdb_id integer,
  created_at timestamptz not null default now()
);
create unique index titles_tmdb_kind_idx on public.titles (tmdb_id, kind) where tmdb_id is not null;
create index titles_franchise_idx on public.titles (franchise_id);

-- ========== seasons / episodes ==========
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  number integer not null,
  name text,
  year integer,
  episode_count integer,
  unique (title_id, number)
);
create index seasons_title_idx on public.seasons (title_id);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  number integer not null,
  name text,
  unique (season_id, number)
);
create index episodes_season_idx on public.episodes (season_id);

-- ========== tags ==========
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'mood' check (kind in ('genre','mood')),
  color text not null default '#c9a8e8',
  sort_order integer not null default 0
);

create table public.title_tags (
  title_id uuid not null references public.titles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (title_id, tag_id)
);
create index title_tags_tag_idx on public.title_tags (tag_id);

-- ========== reviews ==========
-- a review targets exactly one of: a title (film), a season, an episode
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references public.titles(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  score numeric(3,1) check (score >= 0 and score <= 10),
  verdict text,
  pull_quote text,
  body_spoiler_free text,
  body_spoilers text,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  featured boolean not null default false,
  publish_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(title_id, season_id, episode_id) = 1)
);
create unique index one_review_per_title on public.reviews (title_id) where title_id is not null;
create unique index one_review_per_season on public.reviews (season_id) where season_id is not null;
create unique index one_review_per_episode on public.reviews (episode_id) where episode_id is not null;
create index reviews_status_idx on public.reviews (status, published_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- ========== sub-scores ==========
create table public.subscore_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0
);

create table public.review_subscores (
  review_id uuid not null references public.reviews(id) on delete cascade,
  category_id uuid not null references public.subscore_categories(id) on delete cascade,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  primary key (review_id, category_id)
);

-- ========== now reviewing rail ==========
create table public.now_reviewing (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references public.titles(id) on delete cascade,
  display_name text,
  note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ========== lists ==========
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  accent text not null default '#ffd9a8',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.list_entries (
  list_id uuid not null references public.lists(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  rank integer not null,
  blurb text,
  primary key (list_id, title_id)
);
create index list_entries_list_idx on public.list_entries (list_id, rank);

-- ========== newsletter ==========
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  token uuid not null default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(id) on delete set null,
  subject text not null,
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now()
);

-- ========== page views ==========
create table public.page_views (
  path text not null,
  day date not null,
  count integer not null default 0,
  primary key (path, day)
);

-- ========== site config (about page etc.) ==========
create table public.site_config (
  key text primary key,
  value jsonb not null
);

-- ============================================================
-- RLS: everything locked; anon may read published/public rows.
-- All writes happen through the app server with the secret key.
-- ============================================================
alter table public.franchises enable row level security;
alter table public.titles enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.tags enable row level security;
alter table public.title_tags enable row level security;
alter table public.reviews enable row level security;
alter table public.subscore_categories enable row level security;
alter table public.review_subscores enable row level security;
alter table public.now_reviewing enable row level security;
alter table public.lists enable row level security;
alter table public.list_entries enable row level security;
alter table public.subscribers enable row level security;
alter table public.dispatches enable row level security;
alter table public.page_views enable row level security;
alter table public.site_config enable row level security;

create policy "public read" on public.franchises for select using (true);
create policy "public read" on public.titles for select using (true);
create policy "public read" on public.seasons for select using (true);
create policy "public read" on public.episodes for select using (true);
create policy "public read" on public.tags for select using (true);
create policy "public read" on public.title_tags for select using (true);
create policy "public read" on public.subscore_categories for select using (true);
create policy "public read" on public.now_reviewing for select using (true);
create policy "public read" on public.site_config for select using (true);

create policy "published reviews are public" on public.reviews for select
  using (status = 'published' or (status = 'scheduled' and publish_at <= now()));

create policy "subscores of visible reviews" on public.review_subscores for select
  using (exists (select 1 from public.reviews r where r.id = review_id));

create policy "published lists are public" on public.lists for select
  using (published);

create policy "entries of published lists" on public.list_entries for select
  using (exists (select 1 from public.lists l where l.id = list_id and l.published));

-- subscribers / dispatches / page_views: no anon policies (service role only)

-- ========== storage: posters bucket ==========
insert into storage.buckets (id, name, public) values ('posters', 'posters', true)
on conflict (id) do nothing;

create policy "public poster read" on storage.objects for select
  using (bucket_id = 'posters');
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
