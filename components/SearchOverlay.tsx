"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

type Results = {
  franchises: { franchise: { slug: string; name: string }; count: number }[];
  films: TitleHit[];
  series: TitleHit[];
};
type TitleHit = {
  title: { slug: string; name: string; year: number | null; kind: string; poster_url: string | null };
  tags: { id: string; name: string; color: string }[];
  score: number | null;
};

/* Instant as you type · ↑↓ + enter · amber ring = keyboard focus · ESC to close */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [focus, setFocus] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onInput(value: string) {
    setQ(value);
    if (value.trim().length < 2) setResults(null);
  }

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResults(await res.json());
          setFocus(0);
        }
      } catch {
        /* aborted */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const flat = useMemo(
    () =>
      results
        ? [
            ...results.franchises.map((f) => `/franchises/${f.franchise.slug}`),
            ...results.films.map((h) => `/films/${h.title.slug}`),
            ...results.series.map((h) => `/series/${h.title.slug}`),
          ]
        : [],
    [results]
  );

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => Math.min(f + 1, flat.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => Math.max(f - 1, 0));
      }
      if (e.key === "Enter" && flat[focus]) go(flat[focus]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, focus, go, onClose]);

  const filmsBase = results ? results.franchises.length : 0;
  const seriesBase = results ? filmsBase + results.films.length : 0;

  const hitProps = (i: number, href: string) => ({
    className: `search-hit${i === focus ? " is-focused" : ""}`,
    onMouseEnter: () => setFocus(i),
    onClick: () => go(href),
    style: { cursor: "pointer" },
  });

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-label="Search">
      <div className="overlay-panel col" onClick={(e) => e.stopPropagation()}>
        <div
          className="row"
          style={{
            border: "1.5px solid var(--amber)",
            borderRadius: 999,
            padding: "9px 16px",
            background: "rgba(255,217,168,.06)",
          }}
        >
          <span style={{ color: "var(--amber)" }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onInput(e.target.value)}
            placeholder="search films, series, franchises…"
            style={{
              all: "unset",
              flex: 1,
              font: "500 14px var(--mono)",
              color: "var(--bright)",
            }}
          />
          <span className="mono-note" style={{ color: "var(--ghost)", fontSize: 10 }}>
            ESC to close
          </span>
        </div>

        {results && (
          <div className="col" style={{ gap: 14, paddingTop: 6 }}>
            {results.franchises.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="label" style={{ fontSize: 10 }}>Franchises</span>
                {results.franchises.map((f, i) => (
                  <div key={f.franchise.slug} {...hitProps(i, `/franchises/${f.franchise.slug}`)}>
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: "50%", flex: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--border)", color: "var(--lav)", fontSize: 11,
                      }}
                    >
                      ◆
                    </span>
                    <b style={{ color: "var(--bright)", fontSize: 14 }}>{f.franchise.name}</b>
                    <span className="chip" style={{ marginLeft: "auto" }}>
                      {f.count} review{f.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(["films", "series"] as const).map(
              (group) =>
                results[group].length > 0 && (
                  <div className="col" style={{ gap: 4 }} key={group}>
                    <span className="label" style={{ fontSize: 10 }}>{group}</span>
                    {results[group].map((h, i) => {
                      const idx = (group === "films" ? filmsBase : seriesBase) + i;
                      const href = `/${group === "films" ? "films" : "series"}/${h.title.slug}`;
                      return (
                        <div key={h.title.slug} {...hitProps(idx, href)}>
                          {h.title.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={h.title.poster_url}
                              alt=""
                              style={{ width: 26, height: 38, objectFit: "cover", borderRadius: 4, flex: "none" }}
                            />
                          ) : (
                            <span style={{ width: 26, height: 38, borderRadius: 4, background: "var(--panel)", flex: "none" }} />
                          )}
                          <b style={{ color: "var(--bright)", fontSize: 14 }}>{h.title.name}</b>
                          {h.title.year && <span className="chip">{h.title.year}</span>}
                          {h.tags.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className="chip chip--tag"
                              style={{ ["--c" as string]: t.color, fontSize: 9, padding: "2px 8px" }}
                            >
                              {t.name}
                            </span>
                          ))}
                          {h.score !== null && (
                            <span className="sc" style={{ marginLeft: "auto", fontSize: 11 }}>
                              {h.score.toFixed(1)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
            )}
            {flat.length === 0 && (
              <p className="mono-note" style={{ textAlign: "center", padding: "10px 0" }}>
                nothing in the archive matches “{q}”
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
