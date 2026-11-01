-- Readers can like a review — one like per IP address, and liking again takes
-- it back. `voter` is an HMAC of the reader's IP made by the app server, so
-- repeats are recognisable without the address itself ever being stored.
-- The primary key is the one-per-IP rule: a double tap or a race can't make a
-- second row.

create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  voter text not null,
  created_at timestamptz not null default now(),
  primary key (review_id, voter)
);

comment on column public.review_likes.voter is
  'HMAC-SHA256 of the liker''s IP, keyed with the app''s SESSION_SECRET. Never the IP itself.';

-- no anon policy: read and written only by the app server, like page_views
alter table public.review_likes enable row level security;

-- One row per liked review, for the Desk. Grouping here rather than in the
-- app keeps the Desk honest past the API's 1000-row page. security_invoker
-- means it inherits review_likes' RLS, so anon still sees nothing.
create view public.review_like_counts with (security_invoker = true) as
  select review_id, count(*)::int as likes
  from public.review_likes
  group by review_id;
