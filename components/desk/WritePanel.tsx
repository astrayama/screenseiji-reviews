"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { api, Library, DeskTag, DeskTitle, DeskReview, Category } from "./api";
import { QueueSidebar } from "./QueueSidebar";
import { Poster, UploadPoster } from "./shared";
import { EmojiPicker } from "./EmojiPicker";
import { Score } from "../Score";
import { TAG_COLORS } from "@/lib/util";

type Subject =
  | { kind: "title"; id: string }
  | { kind: "season"; id: string; label: string }
  | { kind: "episode"; id: string; label: string };

type TmdbHit = {
  tmdbId: number;
  kind: "film" | "series";
  name: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
};

export function WritePanel({
  library,
  tags,
  categories,
  onChanged,
}: {
  library: Library;
  tags: DeskTag[];
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [titleId, setTitleId] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);

  // the selected title is always derived fresh from the library
  const title = useMemo(
    () => library.titles.find((t) => t.id === titleId) ?? null,
    [library, titleId]
  );

  const openReview = useCallback((t: DeskTitle, s: Subject) => {
    setTitleId(t.id);
    setSubject(s);
  }, []);

  return (
    <div className="desk-grid">
      <div className="col" style={{ gap: 18 }}>
        <PickOrAdd library={library} onPick={(t) => setTitleId(t.id)} onChanged={onChanged} selected={title} setSubject={setSubject} />
        {title && title.kind === "series" && (
          <SubjectPicker title={title} subject={subject} setSubject={setSubject} onChanged={onChanged} />
        )}
        {title && subject && (
          <ReviewEditor
            key={`${subject.kind}:${subject.id}`}
            title={title}
            subject={subject}
            tags={tags}
            titleTags={library.titleTags}
            categories={categories}
            onChanged={onChanged}
          />
        )}
      </div>
      <QueueSidebar library={library} onOpen={openReview} />
    </div>
  );
}

/* ---------------- quick add / library pick ---------------- */

function PickOrAdd({
  library,
  onPick,
  onChanged,
  selected,
  setSubject,
}: {
  library: Library;
  onPick: (t: DeskTitle) => void;
  onChanged: () => Promise<void>;
  selected: DeskTitle | null;
  setSubject: (s: Subject | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [tmdbConfigured, setTmdbConfigured] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  function onInput(value: string) {
    setQ(value);
    if (value.trim().length < 2) setHits([]);
  }

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/desk/tmdb/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const body = await res.json();
        if (res.ok) {
          setTmdbConfigured(body.configured !== false);
          setHits(body.hits ?? []);
          setError("");
        } else setError(body.error ?? "search failed");
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const libraryMatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return library.titles.filter((t) => t.name.toLowerCase().includes(needle)).slice(0, 5);
  }, [q, library]);

  async function importHit(hit: TmdbHit) {
    setBusy(hit.tmdbId);
    setError("");
    try {
      const { title } = await api<{ title: DeskTitle }>("/api/desk/tmdb/import", {
        method: "POST",
        json: { tmdbId: hit.tmdbId, kind: hit.kind },
      });
      await onChanged();
      pick({ ...title, seasons: title.seasons ?? [], franchise: title.franchise ?? null });
      setQ("");
      setHits([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(null);
    }
  }

  function pick(t: DeskTitle) {
    onPick(t);
    setSubject(t.kind === "film" ? { kind: "title", id: t.id } : null);
    setQ("");
    setHits([]);
  }

  return (
    <section className="col" style={{ gap: 10 }}>
      <span className="label">Quick-add from database</span>
      <div
        className="row"
        style={{ border: "1.5px solid var(--amber)", borderRadius: 10, padding: "9px 14px", background: "rgba(255,217,168,.05)" }}
      >
        <span style={{ color: "var(--amber)" }}>⌕</span>
        <input
          value={q}
          onChange={(e) => onInput(e.target.value)}
          placeholder="type a title — metadata autofills…"
          style={{ all: "unset", flex: 1, font: "500 14px var(--mono)", color: "var(--bright)" }}
        />
      </div>
      {!tmdbConfigured && (
        <p className="mono-note" style={{ color: "var(--pink)", margin: 0 }}>
          TMDB key missing — autofill is off. Add TMDB_API_KEY to enable it, or add titles manually below.
        </p>
      )}
      {error && <p className="mono-note" style={{ color: "var(--pink)", margin: 0 }}>{error}</p>}

      {libraryMatches.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <span className="mono-note" style={{ fontSize: 10 }}>already in your library</span>
          {libraryMatches.map((t) => (
            <button key={t.id} className="gl row" style={{ padding: 8, cursor: "pointer", textAlign: "left" }} onClick={() => pick(t)}>
              <Poster url={t.poster_url} w={30} />
              <b style={{ color: "var(--bright)", fontSize: 14 }}>{t.name}</b>
              <span className="chip">{t.kind}</span>
              {t.year && <span className="mono-note">{t.year}</span>}
            </button>
          ))}
        </div>
      )}

      {hits.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          {hits.map((h) => (
            <div key={`${h.kind}-${h.tmdbId}`} className="gl row between" style={{ padding: 8 }}>
              <div className="row" style={{ minWidth: 0 }}>
                <Poster url={h.posterUrl} w={34} />
                <div className="col" style={{ gap: 3, minWidth: 0 }}>
                  <b style={{ color: "var(--bright)", fontSize: 14 }}>
                    {h.name} {h.year && <span className="mono-note">({h.year})</span>}
                  </b>
                  <span className="chip" style={{ alignSelf: "flex-start" }}>{h.kind}</span>
                </div>
              </div>
              <button className="chip chip--solid" style={{ cursor: "pointer", flex: "none" }} onClick={() => importHit(h)} disabled={busy !== null}>
                {busy === h.tmdbId ? "importing…" : "＋ add"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={() => setManualOpen((o) => !o)}>
          {manualOpen ? "hide manual add" : "＋ add manually (no database)"}
        </button>
      </div>
      {manualOpen && <ManualAdd onCreated={async (t) => { await onChanged(); pick(t); setManualOpen(false); }} />}

      {selected && (
        <div className="gl gl--amber row between" style={{ padding: 10 }}>
          <div className="row">
            <Poster url={selected.poster_url} w={40} />
            <div className="col" style={{ gap: 3 }}>
              <b style={{ color: "var(--bright)" }}>
                {selected.name} {selected.year && `(${selected.year})`}
              </b>
              <div className="row" style={{ gap: 4 }}>
                <span className="chip">{selected.kind}</span>
                {selected.franchise && (
                  <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)" }}>
                    {selected.franchise.name} ✓
                  </span>
                )}
              </div>
              {selected.franchise && (
                <span className="mono-note" style={{ fontSize: 10 }}>franchise detected → nests automatically</span>
              )}
            </div>
          </div>
          <UploadPoster titleId={selected.id} onDone={onChanged} />
        </div>
      )}
    </section>
  );
}

function ManualAdd({ onCreated }: { onCreated: (t: DeskTitle) => void }) {
  const [kind, setKind] = useState<"film" | "series">("film");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [runtime, setRuntime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { title } = await api<{ title: DeskTitle }>("/api/desk/titles", {
        method: "POST",
        json: {
          kind,
          name,
          year: year ? Number(year) : null,
          runtime_minutes: kind === "film" && runtime ? Number(runtime) : null,
        },
      });
      onCreated({ ...title, seasons: [], franchise: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gl col" style={{ padding: 12, gap: 8 }}>
      <div className="row">
        {(["film", "series"] as const).map((k) => (
          <button key={k} className={kind === k ? "chip chip--solid" : "chip"} style={{ cursor: "pointer", background: kind === k ? undefined : "none" }} onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="row">
        <input className="input" placeholder="title" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="year" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} style={{ width: 80 }} />
        {kind === "film" && (
          <input className="input" placeholder="mins" value={runtime} onChange={(e) => setRuntime(e.target.value.replace(/\D/g, ""))} style={{ width: 80 }} />
        )}
      </div>
      <div className="row">
        <button className="btn btn--amber" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "…" : "create"}
        </button>
        {error && <span className="mono-note" style={{ color: "var(--pink)" }}>{error}</span>}
      </div>
    </div>
  );
}

/* ---------------- series subject picker ---------------- */

function SubjectPicker({
  title,
  subject,
  setSubject,
  onChanged,
}: {
  title: DeskTitle;
  subject: Subject | null;
  setSubject: (s: Subject) => void;
  onChanged: () => Promise<void>;
}) {
  const [addSeasonOpen, setAddSeasonOpen] = useState(false);
  const [num, setNum] = useState("");
  const [eps, setEps] = useState("");

  async function addSeason() {
    await api("/api/desk/seasons", {
      method: "POST",
      json: { title_id: title.id, number: Number(num), episode_count: eps ? Number(eps) : null },
    });
    setAddSeasonOpen(false);
    setNum("");
    setEps("");
    await onChanged();
  }

  return (
    <section className="col" style={{ gap: 8 }}>
      <span className="label">What are you reviewing?</span>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        {[...title.seasons]
          .sort((a, b) => a.number - b.number)
          .map((s) => (
            <span key={s.id} className="row" style={{ gap: 4 }}>
              <button
                className={subject?.kind === "season" && subject.id === s.id ? "chip chip--solid" : "chip"}
                style={{ cursor: "pointer", background: subject?.kind === "season" && subject.id === s.id ? undefined : "none" }}
                onClick={() => setSubject({ kind: "season", id: s.id, label: `Season ${s.number} verdict` })}
              >
                S{s.number} verdict
              </button>
              {[...s.episodes]
                .sort((a, b) => a.number - b.number)
                .map((e) => (
                  <button
                    key={e.id}
                    className={subject?.kind === "episode" && subject.id === e.id ? "chip chip--solid" : "chip"}
                    style={{
                      cursor: "pointer",
                      background: subject?.kind === "episode" && subject.id === e.id ? undefined : "none",
                      fontSize: 10,
                    }}
                    onClick={() =>
                      setSubject({ kind: "episode", id: e.id, label: `S${s.number}E${e.number}${e.name ? ` — ${e.name}` : ""}` })
                    }
                  >
                    E{e.number}
                  </button>
                ))}
            </span>
          ))}
        <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={() => setAddSeasonOpen((o) => !o)}>
          ＋ season
        </button>
      </div>
      {addSeasonOpen && (
        <div className="row">
          <input className="input" placeholder="season #" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} style={{ width: 90 }} />
          <input className="input" placeholder="episodes" value={eps} onChange={(e) => setEps(e.target.value.replace(/\D/g, ""))} style={{ width: 90 }} />
          <button className="btn btn--amber" onClick={addSeason} disabled={!num}>
            add
          </button>
        </div>
      )}
      {!subject && <p className="mono-note" style={{ margin: 0 }}>pick a season verdict or an episode to start writing</p>}
    </section>
  );
}

/* ---------------- the review editor ---------------- */

function ReviewEditor({
  title,
  subject,
  tags,
  titleTags,
  categories,
  onChanged,
}: {
  title: DeskTitle;
  subject: Subject;
  tags: DeskTag[];
  titleTags: { title_id: string; tag_id: string }[];
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [review, setReview] = useState<DeskReview | null>(null);
  const [subScores, setSubScores] = useState<{ category_id: string; score: number }[]>([]);
  const [form, setForm] = useState({ score: "", emoji: "", verdict: "", pull_quote: "", body_spoiler_free: "", body_spoilers: "" });
  const [publishAt, setPublishAt] = useState("");
  const [status, setStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const key = subject.kind === "title" ? "title_id" : subject.kind === "season" ? "season_id" : "episode_id";
      const { review: r } = await api<{ review: DeskReview }>("/api/desk/reviews", {
        method: "POST",
        json: { [key]: subject.id },
      });
      const { review: full, subScores: subs } = await api<{ review: DeskReview; subScores: { category_id: string; score: number }[] }>(
        `/api/desk/reviews?id=${r.id}`
      );
      setReview(full);
      setSubScores(subs.map((s) => ({ category_id: s.category_id, score: Number(s.score) })));
      setForm({
        score: full.score !== null ? String(full.score) : "",
        emoji: full.emoji ?? "",
        verdict: full.verdict ?? "",
        pull_quote: full.pull_quote ?? "",
        body_spoiler_free: full.body_spoiler_free ?? "",
        body_spoilers: full.body_spoilers ?? "",
      });
      setPublishAt(full.publish_at ? full.publish_at.slice(0, 16) : "");
    })();
  }, [subject]);

  const myTagIds = new Set(titleTags.filter((tt) => tt.title_id === title.id).map((tt) => tt.tag_id));

  async function toggleTag(tagId: string) {
    await api("/api/desk/title-tags", {
      method: "POST",
      json: { title_id: title.id, tag_id: tagId, on: !myTagIds.has(tagId) },
    });
    await onChanged();
  }

  function fieldPayload() {
    return {
      score: form.score === "" ? null : Math.min(10, Math.max(0, Number(form.score))),
      emoji: form.emoji || null,
      verdict: form.verdict || null,
      pull_quote: form.pull_quote || null,
      body_spoiler_free: form.body_spoiler_free || null,
      body_spoilers: form.body_spoilers || null,
      subScores,
    };
  }

  async function save(action?: string) {
    if (!review) return;
    setSaving(true);
    setStatus("");
    try {
      const payload: Record<string, unknown> = { id: review.id, ...fieldPayload() };
      if (action) payload.action = action;
      if (action === "schedule") payload.publish_at = publishAt ? new Date(publishAt).toISOString() : null;
      const { review: updated } = await api<{ review: DeskReview }>("/api/desk/reviews", { method: "PATCH", json: payload });
      setReview(updated);
      setStatus(
        action === "publish"
          ? "published ✦"
          : action === "schedule"
            ? "scheduled"
            : action === "unpublish"
              ? "back to draft"
              : action === "feature"
                ? "featured on home ✦"
                : "saved"
      );
      await onChanged();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!review) return;
    if (!confirm("Delete this review? The film/series stays in your library.")) return;
    await api(`/api/desk/reviews?id=${review.id}`, { method: "DELETE" });
    setStatus("deleted");
    await onChanged();
  }

  if (!review) return <p className="mono-note">opening the review…</p>;

  const subjectLabel = subject.kind === "title" ? title.name : (subject as { label: string }).label;
  const usedCategoryIds = new Set(subScores.map((s) => s.category_id));
  const publicHref = (() => {
    // a title-kind subject can be a film OR a series
    if (subject.kind === "title") {
      return title.kind === "film" ? `/films/${title.slug}` : `/series/${title.slug}`;
    }
    const season = title.seasons.find((s) =>
      subject.kind === "season" ? s.id === subject.id : s.episodes.some((e) => e.id === subject.id)
    );
    if (!season) return `/series/${title.slug}`;
    if (subject.kind === "season") return `/series/${title.slug}/seasons/${season.number}`;
    const episode = season.episodes.find((e) => e.id === subject.id);
    return episode
      ? `/series/${title.slug}/seasons/${season.number}/episodes/${episode.number}`
      : `/series/${title.slug}/seasons/${season.number}`;
  })();

  return (
    <section className="col" style={{ gap: 14 }}>
      <hr className="hr" />
      <div className="row between">
        <span className="label label--amber">Reviewing: {subjectLabel}</span>
        <span className="row" style={{ gap: 6 }}>
          <span className="chip">{review.status}</span>
          {review.featured && <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)" }}>featured</span>}
        </span>
      </div>

      {/* tags live on the root title */}
      <div className="col" style={{ gap: 8 }}>
        <div className="row between">
          <span className="label" style={{ fontSize: 10 }}>Tags</span>
          <span className="mono-note" style={{ fontSize: 10 }}>
            moods are yours to invent · genres come from the database
          </span>
        </div>
        {/* the Moods group renders even when empty — it's where ＋ new mood lives */}
        {(["mood", "genre"] as const).map((kind) => {
          const group = tags.filter((t) => t.kind === kind);
          return (
            <div className="col" key={kind} style={{ gap: 5 }}>
              <span className="label" style={{ fontSize: 9.5 }}>
                {kind === "mood" ? "Moods" : "Genres"}
              </span>
              <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
                {group.map((t) => {
                  const on = myTagIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      className={`chip chip--tag${on ? " is-active" : ""}`}
                      style={{
                        ["--c" as string]: t.color,
                        cursor: "pointer",
                        background: on ? `color-mix(in srgb, ${t.color} 25%, transparent)` : "none",
                      }}
                      onClick={() => toggleTag(t.id)}
                    >
                      {t.name} {on ? "✓" : ""}
                    </button>
                  );
                })}
                {kind === "mood" ? (
                  <NewMoodChip titleId={title.id} existing={tags} onChanged={onChanged} />
                ) : (
                  !group.length && (
                    <span className="mono-note" style={{ fontSize: 10 }}>
                      genres arrive with a TMDB import
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* score + sub-scores */}
      <div className="col" style={{ gap: 8 }}>
        <div className="row between">
          <span className="label" style={{ fontSize: 10 }}>Score + sub-scores</span>
          <span className="mono-note" style={{ fontSize: 10 }}>sub-scores shown in your Tags-tab order ✓</span>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <b style={{ width: 120, fontSize: 13, color: "var(--bright)" }}>Overall</b>
          <input
            className="input"
            style={{ width: 80 }}
            placeholder="0–10"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value.replace(/[^\d.]/g, "") })}
          />
          <EmojiPicker
            value={form.emoji || null}
            onChange={(v) => setForm({ ...form, emoji: v ?? "" })}
          />
        </div>
        {/* exactly what the site will show */}
        <div className="row gl" style={{ padding: "8px 12px", gap: 12, alignSelf: "flex-start" }}>
          <span className="mono-note" style={{ fontSize: 10 }}>on the site:</span>
          <Score
            score={form.score === "" ? null : Number(form.score)}
            emoji={form.emoji || null}
            variant="verdict"
            empty="dash"
          />
        </div>
        {/* mirror the site: rows follow the category order, not insertion order */}
        {[...subScores]
          .sort(
            (a, b) =>
              categories.findIndex((c) => c.id === a.category_id) -
              categories.findIndex((c) => c.id === b.category_id)
          )
          .map((s) => {
          const cat = categories.find((c) => c.id === s.category_id);
          return (
            <div className="row" key={s.category_id}>
              <span style={{ width: 120, fontSize: 13 }}>{cat?.name ?? "?"}</span>
              <input
                className="input"
                style={{ width: 80 }}
                value={s.score}
                onChange={(e) => {
                  const v = Math.min(10, Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0));
                  setSubScores(subScores.map((x) => (x.category_id === s.category_id ? { ...x, score: v } : x)));
                }}
              />
              <button
                className="chip"
                style={{ cursor: "pointer", background: "none" }}
                onClick={() => setSubScores(subScores.filter((x) => x.category_id !== s.category_id))}
              >
                ✕
              </button>
            </div>
          );
        })}
        <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
          {categories
            .filter((c) => !usedCategoryIds.has(c.id))
            .map((c) => (
              <button
                key={c.id}
                className="chip"
                style={{ cursor: "pointer", background: "none" }}
                onClick={() => setSubScores([...subScores, { category_id: c.id, score: 7 }])}
              >
                ＋ {c.name}
              </button>
            ))}
        </div>
        <span className="mono-note" style={{ fontSize: 10 }}>every category optional — add only what you have a take on</span>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="label" style={{ fontSize: 10 }}>The verdict (spoiler-free, one or two sentences — becomes the meta description)</span>
        <textarea className="input" rows={2} value={form.verdict} onChange={(e) => setForm({ ...form, verdict: e.target.value })} />
      </div>
      <div className="col" style={{ gap: 6 }}>
        <span className="label" style={{ fontSize: 10 }}>Pull quote (big enough to screenshot)</span>
        <input className="input" value={form.pull_quote} onChange={(e) => setForm({ ...form, pull_quote: e.target.value })} />
      </div>
      <div className="col" style={{ gap: 6 }}>
        <span className="label" style={{ fontSize: 10 }}>Spoiler-free body — markdown</span>
        <textarea
          className="input"
          rows={10}
          value={form.body_spoiler_free}
          onChange={(e) => setForm({ ...form, body_spoiler_free: e.target.value })}
        />
      </div>
      <div className="col" style={{ gap: 6 }}>
        <span className="label" style={{ fontSize: 10 }}>Spoiler zone body — blurred until clicked</span>
        <textarea
          className="input"
          rows={5}
          value={form.body_spoilers}
          onChange={(e) => setForm({ ...form, body_spoilers: e.target.value })}
        />
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <button className="btn btn--amber" onClick={() => save("publish")} disabled={saving}>Publish</button>
        <button className="btn btn--ghost" onClick={() => save()} disabled={saving}>Save draft</button>
        <button className="btn btn--ghost" onClick={() => setPreviewOpen((o) => !o)}>Preview</button>
        <span className="row" style={{ gap: 5 }}>
          <input
            className="input"
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            style={{ width: 190, padding: "6px 10px" }}
          />
          <button className="btn btn--ghost" onClick={() => save("schedule")} disabled={saving || !publishAt}>Schedule</button>
        </span>
        {review.status !== "draft" && (
          <button className="btn btn--ghost" onClick={() => save("unpublish")} disabled={saving}>Unpublish</button>
        )}
        <button className="btn btn--ghost" onClick={() => save(review.featured ? "unfeature" : "feature")} disabled={saving}>
          {review.featured ? "Un-feature" : "Feature on home"}
        </button>
        <button className="btn btn--ghost" style={{ color: "var(--pink)" }} onClick={remove}>Delete</button>
      </div>
      <div className="row">
        {status && <span className="mono-note" style={{ color: "var(--amber)" }}>{status}</span>}
        {review.status !== "draft" && (
          <a className="mono-note" href={publicHref} target="_blank" style={{ textDecoration: "underline" }}>
            view live →
          </a>
        )}
      </div>

      {previewOpen && (
        <div className="gl col" style={{ padding: 18, gap: 10 }}>
          <span className="label" style={{ fontSize: 10 }}>Preview</span>
          {form.verdict && <p style={{ margin: 0, color: "var(--bright)" }}>{form.verdict}</p>}
          <div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(form.body_spoiler_free || "*nothing yet*") as string }} />
          {form.pull_quote && <div className="pull-quote">{form.pull_quote}</div>}
          {form.body_spoilers && (
            <>
              <span className="label" style={{ fontSize: 10 }}>Spoiler zone</span>
              <div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(form.body_spoilers) as string }} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------- invent a mood while writing ---------------- */

/* Moods are the one tag kind that only ever comes from Isa — TMDB supplies
   genres. Creating one here applies it to the open review immediately, which
   also means it shows up publicly as soon as that review is published. */
function NewMoodChip({
  titleId,
  existing,
  onChanged,
}: {
  titleId: string;
  existing: DeskTag[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    try {
      const moods = existing.filter((t) => t.kind === "mood");
      const { tag } = await api<{ tag: DeskTag }>("/api/desk/tags", {
        method: "POST",
        json: {
          name: clean,
          kind: "mood",
          color: TAG_COLORS[moods.length % TAG_COLORS.length],
          sort_order: moods.length,
        },
      });
      // apply it to this review's title straight away
      await api("/api/desk/title-tags", {
        method: "POST",
        json: { title_id: titleId, tag_id: tag.id, on: true },
      });
      setName("");
      setOpen(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't add that mood");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="chip"
        style={{ cursor: "pointer", background: "none", borderStyle: "dashed" }}
        onClick={() => setOpen(true)}
      >
        ＋ new mood
      </button>
    );
  }

  return (
    <span className="row" style={{ gap: 5 }}>
      <input
        className="input"
        autoFocus
        placeholder="e.g. Melancholy"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); create(); }
          if (e.key === "Escape") { setOpen(false); setName(""); setError(""); }
        }}
        style={{ width: 150, padding: "5px 10px" }}
      />
      <button className="chip chip--solid" style={{ cursor: "pointer" }} onClick={create} disabled={busy || !name.trim()}>
        {busy ? "…" : "add"}
      </button>
      <button
        className="chip"
        style={{ cursor: "pointer", background: "none" }}
        onClick={() => { setOpen(false); setName(""); setError(""); }}
      >
        ✕
      </button>
      {error && <span className="mono-note" style={{ color: "var(--pink)" }}>{error}</span>}
    </span>
  );
}
