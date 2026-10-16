-- Seasons get their own poster. TMDB ships a distinct poster per season, and
-- a season page that shows the series' art for every season looks wrong once a
-- show has more than one. Nullable on purpose: the season page falls back to
-- the series poster when a season has none.

alter table public.seasons add column poster_url text;

comment on column public.seasons.poster_url is
  'Season-specific poster. Falls back to titles.poster_url when null.';
