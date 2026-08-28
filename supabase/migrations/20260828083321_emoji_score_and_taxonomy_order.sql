-- ========== 1. optional emoji score on reviews ==========
alter table public.reviews
  add column emoji text;

alter table public.reviews
  add constraint reviews_emoji_shape check (
    emoji is null
    or (char_length(emoji) between 1 and 16 and emoji = btrim(emoji))
  );

comment on column public.reviews.emoji is
  'Optional per-review overall feeling. Dominant visual where set; the numeric score still renders beneath it. Never applied to sub-scores or to aggregate (series/franchise) averages.';

-- ========== 2. give tags + categories distinct sort_order ==========
-- Everything currently sits at 0. Manual reordering is unreliable while values
-- tie, so rank each list once, preserving the order those lists read in today.
with ranked as (
  select id, (row_number() over (partition by kind order by sort_order, name) - 1) as rn
  from public.tags
)
update public.tags t set sort_order = ranked.rn
from ranked where ranked.id = t.id;

with ranked as (
  select id, (row_number() over (order by sort_order, name) - 1) as rn
  from public.subscore_categories
)
update public.subscore_categories c set sort_order = ranked.rn
from ranked where ranked.id = c.id;
