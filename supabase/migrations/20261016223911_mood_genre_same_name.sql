-- A mood and a genre may share a name.
--
-- TMDB import auto-creates genres ("Drama", "Mystery", "Thriller"…), and the
-- old global unique on slug meant a mood with any of those names was rejected
-- with "a tag with that name exists" — the most likely reason moods felt
-- impossible to add. Every lookup already filters on kind AND slug
-- (TagChip builds /archive?mood=<slug> vs ?genre=<slug>; getArchive matches
-- both), so uniqueness only ever needed to hold within a kind.

alter table public.tags drop constraint tags_slug_key;

alter table public.tags add constraint tags_kind_slug_key unique (kind, slug);
