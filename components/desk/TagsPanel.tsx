"use client";

import { useState } from "react";
import { api, DeskTag, Category } from "./api";
import { TAG_COLORS } from "@/lib/util";

export function TagsPanel({
  tags,
  categories,
  onChanged,
}: {
  tags: DeskTag[];
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"mood" | "genre">("mood");
  const [color, setColor] = useState(TAG_COLORS[3]);
  const [catName, setCatName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* every mutation goes through here, so nothing ever fails silently */
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      setError("");
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "that didn't work");
    } finally {
      setBusy(false);
    }
  }

  const byKind = (k: "mood" | "genre") => tags.filter((t) => t.kind === k);

  function addTag() {
    if (!name.trim()) return;
    run(async () => {
      await api("/api/desk/tags", {
        method: "POST",
        json: { name, kind, color, sort_order: byKind(kind).length },
      });
      setName("");
    });
  }

  function addCategory() {
    if (!catName.trim()) return;
    run(async () => {
      await api("/api/desk/categories", {
        method: "POST",
        json: { name: catName, sort_order: categories.length },
      });
      setCatName("");
    });
  }

  /* Bulk order, not a two-row swap: swapping breaks when sort_order values tie. */
  function moveTag(k: "mood" | "genre", id: string, dir: -1 | 1) {
    const list = byKind(k);
    const i = list.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    run(() => api("/api/desk/tags", { method: "PATCH", json: { order: next.map((t) => t.id) } }));
  }

  function moveCategory(id: string, dir: -1 | 1) {
    const i = categories.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    run(() => api("/api/desk/categories", { method: "PATCH", json: { order: next.map((c) => c.id) } }));
  }

  return (
    <div className="col" style={{ gap: 26, maxWidth: 640 }}>
      {(["mood", "genre"] as const).map((k) => (
        <section key={k} className="col" style={{ gap: 8 }}>
          <span className="label">{k === "mood" ? "Moods" : "Genres"}</span>
          {byKind(k).length === 0 && (
            <span className="mono-note">
              none yet{" "}
              {k === "genre"
                ? "— TMDB imports create genres automatically"
                : "— moods are your signature, invent a few"}
            </span>
          )}
          {byKind(k).map((t, i) => (
            <TagRow
              key={t.id}
              tag={t}
              first={i === 0}
              last={i === byKind(k).length - 1}
              busy={busy}
              onMove={(dir) => moveTag(k, t.id, dir)}
              onPatch={(patch) => run(() => api("/api/desk/tags", { method: "PATCH", json: { id: t.id, ...patch } }))}
              onDelete={() =>
                confirm(`Delete "${t.name}"? It'll vanish from every title. Renaming keeps your data.`) &&
                run(() => api(`/api/desk/tags?id=${t.id}`, { method: "DELETE" }))
              }
            />
          ))}
        </section>
      ))}

      <section className="gl col" style={{ padding: 14, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>New tag</span>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input className="input" style={{ width: 170 }} placeholder="e.g. Melancholy" value={name} onChange={(e) => setName(e.target.value)} />
          {(["mood", "genre"] as const).map((k) => (
            <button
              key={k}
              className={kind === k ? "chip chip--solid" : "chip"}
              style={{ cursor: "pointer", background: kind === k ? undefined : "none" }}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
          <Swatches value={color} onPick={setColor} />
          <button className="btn btn--amber" onClick={addTag} disabled={busy || !name.trim()}>add</button>
        </div>
      </section>

      <section className="col" style={{ gap: 8 }}>
        <span className="label">Sub-score categories</span>
        <span className="mono-note" style={{ fontSize: 10.5 }}>
          renaming keeps every existing sub-score · this order is the order the bars appear on the site
        </span>
        {categories.length === 0 && (
          <span className="mono-note">e.g. Cinematography, Music &amp; Score, Acting, Casting, VFX, Direction, Writing</span>
        )}
        {categories.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            first={i === 0}
            last={i === categories.length - 1}
            busy={busy}
            onMove={(dir) => moveCategory(c.id, dir)}
            onRename={(newName) =>
              run(() => api("/api/desk/categories", { method: "PATCH", json: { id: c.id, name: newName } }))
            }
            onDelete={() =>
              confirm(
                `Renaming keeps your data. Deleting "${c.name}" removes this sub-score from every review that has it. Delete anyway?`
              ) && run(() => api(`/api/desk/categories?id=${c.id}`, { method: "DELETE" }))
            }
          />
        ))}
        <div className="row">
          <input className="input" style={{ width: 200 }} placeholder="new category" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <button className="btn btn--amber" onClick={addCategory} disabled={busy || !catName.trim()}>add</button>
        </div>
      </section>

      {error && <p className="mono-note" style={{ color: "var(--pink)" }}>{error}</p>}
    </div>
  );
}

/* ---------------- one tag ---------------- */

function TagRow({
  tag,
  first,
  last,
  busy,
  onMove,
  onPatch,
  onDelete,
}: {
  tag: DeskTag;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (dir: -1 | 1) => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [kindWarning, setKindWarning] = useState(false);
  const url = `/archive?${tag.kind === "genre" ? "genre" : "mood"}=${tag.slug}`;

  return (
    <div className="gl col" style={{ padding: "10px 12px", gap: 8 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        <span className="chip chip--tag" style={{ ["--c" as string]: tag.color }}>{tag.name}</span>
        <input
          className="input"
          style={{ width: 150 }}
          defaultValue={tag.name}
          aria-label={`Rename ${tag.name}`}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== tag.name) onPatch({ name: v });
          }}
        />
        {(["mood", "genre"] as const).map((k) => (
          <button
            key={k}
            className={tag.kind === k ? "chip chip--solid" : "chip"}
            style={{ cursor: "pointer", background: tag.kind === k ? undefined : "none", fontSize: 10 }}
            disabled={busy}
            onClick={() => {
              if (tag.kind === k) return;
              setKindWarning(true);
              onPatch({ kind: k });
            }}
          >
            {k}
          </button>
        ))}
        <Swatches value={tag.color} onPick={(c) => onPatch({ color: c })} />
        <span className="row" style={{ marginLeft: "auto", gap: 4 }}>
          <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={busy || first} onClick={() => onMove(-1)}>↑</button>
          <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={busy || last} onClick={() => onMove(1)}>↓</button>
          <button className="chip" style={{ cursor: "pointer", background: "none", color: "var(--pink)" }} disabled={busy} onClick={onDelete}>✕</button>
        </span>
      </div>
      <span className="mono-note" style={{ fontSize: 10 }}>
        <a href={url} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>{url}</a>
        {" · "}slug fixed at creation, so this link never breaks on a rename
      </span>
      {kindWarning && (
        <span className="mono-note" style={{ fontSize: 10, color: "var(--pink)" }}>
          heads up — switching mood/genre moves this tag&apos;s link, so old links to the previous one stop matching
        </span>
      )}
    </div>
  );
}

/* ---------------- one sub-score category ---------------- */

function CategoryRow({
  category,
  first,
  last,
  busy,
  onMove,
  onRename,
  onDelete,
}: {
  category: Category;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (dir: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="gl row" style={{ padding: "8px 12px", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13.5, color: "var(--bright)", width: 130 }}>{category.name}</span>
      <input
        className="input"
        style={{ width: 170 }}
        defaultValue={category.name}
        aria-label={`Rename ${category.name}`}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== category.name) onRename(v);
        }}
      />
      <span className="row" style={{ marginLeft: "auto", gap: 4 }}>
        <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={busy || first} onClick={() => onMove(-1)}>↑</button>
        <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={busy || last} onClick={() => onMove(1)}>↓</button>
        <button className="chip" style={{ cursor: "pointer", background: "none", color: "var(--pink)" }} disabled={busy} onClick={onDelete}>✕</button>
      </span>
    </div>
  );
}

/* ---------------- color picker ---------------- */

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          aria-label={`color ${c}`}
          onClick={() => onPick(c)}
          style={{
            width: 14, height: 14, borderRadius: "50%", background: c, border: "none",
            cursor: "pointer", outline: value.toLowerCase() === c.toLowerCase() ? "2px solid #fff" : "none",
          }}
        />
      ))}
      <input
        type="color"
        aria-label="custom color"
        value={value}
        onChange={(e) => onPick(e.target.value)}
        style={{
          width: 20, height: 20, padding: 0, border: "1px solid var(--border)",
          borderRadius: 4, background: "none", cursor: "pointer",
        }}
      />
    </span>
  );
}
