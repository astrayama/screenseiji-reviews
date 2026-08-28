"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, Library, DeskTitle } from "./api";
import { Poster, UploadPoster } from "./shared";

type Franchise = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
};

/* The Library — every title on one shelf: edit metadata, swap posters,
   nest titles into franchises, reorder them, or remove things entirely. */
export function LibraryPanel({
  library,
  onChanged,
}: {
  library: Library;
  onChanged: () => Promise<void>;
}) {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const loadFranchises = useCallback(async () => {
    const { franchises } = await api<{ franchises: Franchise[] }>("/api/desk/franchises");
    setFranchises(franchises);
  }, []);

  useEffect(() => {
    (async () => {
      await loadFranchises();
    })();
  }, [loadFranchises]);

  const reviewsByTitle = useMemo(() => {
    const map = new Map<string, { published: number; drafts: number }>();
    for (const t of library.titles) {
      const subjectIds = new Set<string>([t.id]);
      for (const s of t.seasons) {
        subjectIds.add(s.id);
        for (const e of s.episodes) subjectIds.add(e.id);
      }
      let published = 0;
      let drafts = 0;
      for (const r of library.reviews) {
        const sid = r.title_id ?? r.season_id ?? r.episode_id;
        if (sid && subjectIds.has(sid)) {
          if (r.status === "published") published += 1;
          else drafts += 1;
        }
      }
      map.set(t.id, { published, drafts });
    }
    return map;
  }, [library]);

  const shown = library.titles.filter(
    (t) => !filter.trim() || t.name.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="col" style={{ gap: 18, maxWidth: 680 }}>
      <div className="row between">
        <span className="label">The library — {library.titles.length} title{library.titles.length === 1 ? "" : "s"}</span>
        <input
          className="input"
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 160, padding: "5px 10px" }}
        />
      </div>

      {library.titles.length === 0 && (
        <p className="mono-note">nothing here yet — add titles from the Write tab</p>
      )}

      <div className="col" style={{ gap: 8 }}>
        {shown.map((t) => (
          <TitleRow
            key={t.id}
            title={t}
            franchises={franchises}
            counts={reviewsByTitle.get(t.id) ?? { published: 0, drafts: 0 }}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onChanged={onChanged}
            onFranchisesChanged={loadFranchises}
          />
        ))}
      </div>

      <FranchiseManager franchises={franchises} onChanged={async () => { await loadFranchises(); await onChanged(); }} />
    </div>
  );
}

/* ---------------- one title row ---------------- */

function TitleRow({
  title,
  franchises,
  counts,
  open,
  onToggle,
  onChanged,
  onFranchisesChanged,
}: {
  title: DeskTitle;
  franchises: Franchise[];
  counts: { published: number; drafts: number };
  open: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  onFranchisesChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: title.name,
    year: title.year ? String(title.year) : "",
    runtime: title.runtime_minutes ? String(title.runtime_minutes) : "",
    status_text: title.status_text ?? "",
    synopsis: title.synopsis ?? "",
    franchise_id: title.franchise_id ?? "",
    franchise_order: title.franchise_order ? String(title.franchise_order) : "",
  });
  const [newFranchise, setNewFranchise] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // refresh the form when a newer copy of the title arrives
  const [prevTitle, setPrevTitle] = useState(title);
  if (prevTitle !== title) {
    setPrevTitle(title);
    setForm({
      name: title.name,
      year: title.year ? String(title.year) : "",
      runtime: title.runtime_minutes ? String(title.runtime_minutes) : "",
      status_text: title.status_text ?? "",
      synopsis: title.synopsis ?? "",
      franchise_id: title.franchise_id ?? "",
      franchise_order: title.franchise_order ? String(title.franchise_order) : "",
    });
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      let franchiseId: string | null = form.franchise_id || null;
      if (newFranchise.trim()) {
        const { franchise } = await api<{ franchise: Franchise }>("/api/desk/franchises", {
          method: "POST",
          json: { name: newFranchise },
        });
        franchiseId = franchise.id;
        setNewFranchise("");
        await onFranchisesChanged();
      }
      await api("/api/desk/titles", {
        method: "PATCH",
        json: {
          id: title.id,
          name: form.name.trim() || title.name,
          year: form.year ? Number(form.year) : null,
          runtime_minutes: title.kind === "film" && form.runtime ? Number(form.runtime) : null,
          status_text: title.kind === "series" ? form.status_text.trim() || null : null,
          synopsis: form.synopsis.trim() || null,
          franchise_id: franchiseId,
          franchise_order: form.franchise_order ? Number(form.franchise_order) : null,
        },
      });
      setStatus("saved ✦");
      await onChanged();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const what = counts.published + counts.drafts;
    if (
      !confirm(
        `Delete “${title.name}” from the library?` +
          (what ? ` Its ${what} review${what === 1 ? "" : "s"} (and any seasons/episodes) go with it.` : "") +
          " This can't be undone."
      )
    )
      return;
    await api(`/api/desk/titles?id=${title.id}`, { method: "DELETE" });
    await onChanged();
  }

  return (
    <div className={`gl col${open ? " gl--amber" : ""}`} style={{ padding: "10px 14px", gap: 12 }}>
      <button
        onClick={onToggle}
        style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
        aria-expanded={open}
      >
        <span className="row" style={{ minWidth: 0 }}>
          <Poster url={title.poster_url} w={28} />
          <b style={{ color: "var(--bright)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title.name} {title.year && <span className="mono-note">({title.year})</span>}
          </b>
        </span>
        <span className="row" style={{ flex: "none", gap: 5 }}>
          <span className="chip" style={{ fontSize: 9 }}>{title.kind}</span>
          {title.franchise && (
            <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)", fontSize: 9 }}>
              {title.franchise.name}
            </span>
          )}
          {counts.published > 0 && (
            <span className="chip chip--tag" style={{ ["--c" as string]: "var(--mint)", fontSize: 9 }}>
              {counts.published} live
            </span>
          )}
          {counts.drafts > 0 && <span className="chip" style={{ fontSize: 9 }}>{counts.drafts} draft</span>}
          <span style={{ color: open ? "var(--amber)" : "var(--faint)" }}>{open ? "▴" : "▾"}</span>
        </span>
      </button>

      {open && (
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Name" />
            <input className="input" style={{ width: 76 }} placeholder="year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })} />
            {title.kind === "film" ? (
              <input className="input" style={{ width: 76 }} placeholder="mins" value={form.runtime} onChange={(e) => setForm({ ...form, runtime: e.target.value.replace(/\D/g, "") })} />
            ) : (
              <input className="input" style={{ width: 110 }} placeholder="e.g. Ongoing" value={form.status_text} onChange={(e) => setForm({ ...form, status_text: e.target.value })} />
            )}
          </div>
          <textarea className="input" rows={2} placeholder="synopsis" value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} />
          <div className="row" style={{ flexWrap: "wrap" }}>
            <select className="input" style={{ width: 200 }} value={form.franchise_id} onChange={(e) => setForm({ ...form, franchise_id: e.target.value })} aria-label="Franchise">
              <option value="">— no franchise —</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input className="input" style={{ width: 150 }} placeholder="or new franchise…" value={newFranchise} onChange={(e) => setNewFranchise(e.target.value)} />
            <input className="input" style={{ width: 100 }} placeholder="order #" value={form.franchise_order} onChange={(e) => setForm({ ...form, franchise_order: e.target.value.replace(/\D/g, "") })} title="Position on the franchise shelf (release order)" />
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn btn--amber" onClick={save} disabled={saving}>{saving ? "…" : "save"}</button>
            <UploadPoster titleId={title.id} onDone={onChanged} />
            <a className="chip" href={title.kind === "film" ? `/films/${title.slug}` : `/series/${title.slug}`} target="_blank">
              view page →
            </a>
            <button className="btn btn--ghost" style={{ color: "var(--pink)", marginLeft: "auto" }} onClick={remove}>
              delete
            </button>
          </div>
          {status && <span className="mono-note" style={{ color: status.includes("✦") ? "var(--amber)" : "var(--pink)" }}>{status}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------- franchise manager ---------------- */

function FranchiseManager({
  franchises,
  onChanged,
}: {
  franchises: Franchise[];
  onChanged: () => Promise<void>;
}) {
  const [edits, setEdits] = useState<Record<string, { name: string; description: string }>>({});

  function editState(f: Franchise) {
    return edits[f.id] ?? { name: f.name, description: f.description ?? "" };
  }

  async function save(f: Franchise) {
    const e = editState(f);
    await api("/api/desk/franchises", {
      method: "PATCH",
      json: { id: f.id, name: e.name, description: e.description },
    });
    await onChanged();
  }

  async function remove(f: Franchise) {
    if (!confirm(`Delete the “${f.name}” franchise? Its titles stay — they just un-nest.`)) return;
    await api(`/api/desk/franchises?id=${f.id}`, { method: "DELETE" });
    await onChanged();
  }

  if (!franchises.length) return null;

  return (
    <section className="col" style={{ gap: 8 }}>
      <span className="label">Franchises</span>
      {franchises.map((f) => (
        <div key={f.id} className="gl row" style={{ padding: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ width: 170 }}
            value={editState(f).name}
            onChange={(e) => setEdits({ ...edits, [f.id]: { ...editState(f), name: e.target.value } })}
            aria-label="Franchise name"
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="description"
            value={editState(f).description}
            onChange={(e) => setEdits({ ...edits, [f.id]: { ...editState(f), description: e.target.value } })}
          />
          <span className="chip" style={{ fontSize: 9 }}>{f.memberCount} title{f.memberCount === 1 ? "" : "s"}</span>
          <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={() => save(f)}>save</button>
          <button className="chip" style={{ cursor: "pointer", background: "none", color: "var(--pink)" }} onClick={() => remove(f)}>✕</button>
        </div>
      ))}
    </section>
  );
}
