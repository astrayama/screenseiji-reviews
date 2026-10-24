import type { Tag } from "@/lib/queries";
import { splitTags } from "@/lib/util";
import { TagChip } from "./TagChip";

/* The two labelled rows every review page shows under its title: the moods
   Isa invented, then the genres TMDB supplied. A kind with nothing in it is
   skipped entirely rather than leaving a bare heading behind. */
export function TagRows({ tags }: { tags: Tag[] }) {
  const { moods, genres } = splitTags(tags);
  const groups = [
    ["Moods", moods],
    ["Genres", genres],
  ] as const;
  if (!moods.length && !genres.length) return null;

  return (
    <div className="col" style={{ gap: 7 }}>
      {groups.map(([label, group]) =>
        group.length ? (
          <div className="col" key={label} style={{ gap: 5 }}>
            <span className="label" style={{ fontSize: 10 }}>{label}</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
              {group.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
