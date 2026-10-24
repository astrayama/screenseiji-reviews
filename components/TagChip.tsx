import Link from "next/link";
import type { Tag } from "@/lib/queries";

export function TagChip({
  tag,
  count,
  active = false,
  href,
}: {
  tag: Tag;
  count?: number;
  active?: boolean;
  href?: string;
}) {
  const target =
    href ?? `/archive?${tag.kind === "genre" ? "genre" : "mood"}=${tag.slug}`;
  return (
    <Link
      href={target}
      className={`chip chip--tag${tag.kind === "mood" ? " chip--mood" : ""}${active ? " is-active" : ""}`}
      style={{ ["--c" as string]: tag.color }}
    >
      {tag.name}
      {count !== undefined && <span style={{ opacity: 0.75 }}>· {count}</span>}
    </Link>
  );
}
