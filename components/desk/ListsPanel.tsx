"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Library } from "./api";
import { TAG_COLORS } from "@/lib/util";

type ListEntry = { rank: number; blurb: string | null; title: { id: string; name: string; year: number | null; poster_url: string | null } };
type DeskList = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  published: boolean;
  entries: ListEntry[];
};

export function ListsPanel({ library }: { library: Library }) {
  const [lists, setLists] = useState<DeskList[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { lists } = await api<{ lists: DeskList[] }>("/api/desk/lists");
    setLists(lists.map((l) => ({ ...l, entries: [...l.entries].sort((a, b) => a.rank - b.rank) })));
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function createList() {
    if (!newName.trim()) return;
    try {
      const { list } = await api<{ list: DeskList }>("/api/desk/lists", { method: "POST", json: { name: newName } });
      setNewName("");
      setError("");
      await load();
      setOpenId(list.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  async function removeList(id: string) {
    if (!confirm("Delete this list?")) return;
    await api(`/api/desk/lists?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="col" style={{ gap: 16, maxWidth: 640 }}>
      <div className="row">
        <input className="input" style={{ width: 240 }} placeholder="new list — e.g. Top 10 of 2026" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn--amber" onClick={createList} disabled={!newName.trim()}>create</button>
        {error && <span className="mono-note" style={{ color: "var(--pink)" }}>{error}</span>}
      </div>
      {lists.length === 0 && <p className="mono-note">no lists yet — rankings, comfort watches, whatever you like</p>}
      {lists.map((l) => (
        <ListEditor
          key={l.id}
          list={l}
          library={library}
          open={openId === l.id}
          onToggle={() => setOpenId(openId === l.id ? null : l.id)}
          onDelete={() => removeList(l.id)}
          onSaved={load}
        />
      ))}
    </div>
  );
}

function ListEditor({
  list,
  library,
  open,
  onToggle,
  onDelete,
  onSaved,
}: {
  list: DeskList;
  library: Library;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => Promise<void>;
}) {
  const [entries, setEntries] = useState(list.entries);
  const [description, setDescription] = useState(list.description ?? "");
  const [accent, setAccent] = useState(list.accent);
  const [addId, setAddId] = useState("");
  const [status, setStatus] = useState("");

  // reset editor state when a fresh copy of the list arrives
  const [prevList, setPrevList] = useState(list);
  if (prevList !== list) {
    setPrevList(list);
    setEntries(list.entries);
    setDescription(list.description ?? "");
    setAccent(list.accent);
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...entries];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setEntries(next);
  }

  async function save() {
    setStatus("");
    await api("/api/desk/lists", {
      method: "PATCH",
      json: {
        id: list.id,
        description,
        accent,
        entries: entries.map((e, i) => ({ title_id: e.title.id, rank: i + 1, blurb: e.blurb })),
      },
    });
    setStatus("saved ✦");
    await onSaved();
  }

  return (
    <section className="gl col" style={{ padding: 14, gap: 10, borderColor: `color-mix(in srgb, ${list.accent} 45%, transparent)` }}>
      <button onClick={onToggle} style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
        <b style={{ color: "var(--bright)", fontSize: 15 }}>{list.name}</b>
        <span className="row">
          <span className="mono-note">{list.entries.length} entries · /lists/{list.slug}</span>
          <span style={{ color: "var(--faint)" }}>{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <>
          <input className="input" placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="row">
            <span className="mono-note" style={{ fontSize: 10 }}>accent</span>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`accent ${c}`}
                onClick={() => setAccent(c)}
                style={{ width: 16, height: 16, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: accent === c ? "2px solid #fff" : "none" }}
              />
            ))}
          </div>
          {entries.map((e, i) => (
            <div key={e.title.id} className="row between">
              <span className="row" style={{ minWidth: 0 }}>
                <b style={{ font: "700 14px var(--mono)", color: "var(--amber)", width: 22 }}>{i + 1}</b>
                <span style={{ fontSize: 13.5, color: "var(--bright)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.title.name} {e.title.year && <span className="mono-note">({e.title.year})</span>}
                </span>
              </span>
              <span className="row" style={{ flex: "none" }}>
                <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={i === entries.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="chip" style={{ cursor: "pointer", background: "none", color: "var(--pink)" }} onClick={() => setEntries(entries.filter((x) => x.title.id !== e.title.id))}>✕</button>
              </span>
            </div>
          ))}
          <div className="row">
            <select className="input" value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">— add a title —</option>
              {library.titles
                .filter((t) => !entries.some((e) => e.title.id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.year ? `(${t.year})` : ""}
                  </option>
                ))}
            </select>
            <button
              className="chip"
              style={{ cursor: "pointer", background: "none" }}
              disabled={!addId}
              onClick={() => {
                const t = library.titles.find((x) => x.id === addId);
                if (t) setEntries([...entries, { rank: entries.length + 1, blurb: null, title: { id: t.id, name: t.name, year: t.year, poster_url: t.poster_url } }]);
                setAddId("");
              }}
            >
              ＋ add
            </button>
          </div>
          <div className="row">
            <button className="btn btn--amber" onClick={save}>save list</button>
            <button className="btn btn--ghost" style={{ color: "var(--pink)" }} onClick={onDelete}>delete</button>
            {status && <span className="mono-note" style={{ color: "var(--amber)" }}>{status}</span>}
          </div>
        </>
      )}
    </section>
  );
}
