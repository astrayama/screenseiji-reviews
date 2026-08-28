"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EMOJI_SCALE, emojiLabel, assertNeutralPalette, normalizeEmoji } from "@/lib/emoji";

/* Optional emoji score. Filter by word ("loved") or paste the emoji itself.
   The list lives in lib/emoji.ts — edit it there. */
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [focus, setFocus] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    assertNeutralPalette();
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function toggle(next: boolean) {
    setOpen(next);
    if (!next) setFilter("");
  }

  function onFilterChange(value: string) {
    setFilter(value);
    setFocus(0);
  }

  // close on an outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) toggle(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return EMOJI_SCALE;
    const squashed = q.replace(/[^a-z0-9]/g, "");
    return EMOJI_SCALE.filter(
      (o) =>
        o.char === filter.trim() ||
        o.label.toLowerCase().includes(q) ||
        (squashed.length > 0 && o.label.toLowerCase().replace(/[^a-z0-9]/g, "").includes(squashed))
    );
  }, [filter]);

  // an off-palette one-off: typed text that is clearly an emoji, not a word
  const typed = normalizeEmoji(filter);
  const offPalette =
    typed && !/[a-z0-9]/i.test(typed) && !matches.some((m) => m.char === typed) ? typed : null;

  const rows = offPalette ? [...matches, { char: offPalette, label: "use this one" }] : matches;

  function pick(char: string) {
    onChange(char);
    toggle(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      toggle(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus((f) => Math.min(f + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[focus]) pick(rows[focus].char);
    } else if (e.key === "Backspace" && filter === "" && value) {
      e.preventDefault();
      onChange(null);
    }
  }

  const label = value ? emojiLabel(value) : null;

  return (
    <div ref={wrapRef} className="row" style={{ position: "relative", gap: 5 }}>
      <button
        type="button"
        className="chip"
        style={{ cursor: "pointer", background: "none", gap: 7 }}
        onClick={() => toggle(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {value ? (
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{value}</span>
            <span style={{ color: "var(--muted)" }}>{label ?? "your pick"}</span>
          </>
        ) : (
          <span style={{ color: "var(--faint)" }}>＋ feeling</span>
        )}
      </button>

      {value && (
        <button
          type="button"
          className="chip"
          style={{ cursor: "pointer", background: "none", color: "var(--pink)" }}
          onClick={() => onChange(null)}
          aria-label="Clear the emoji"
        >
          ✕
        </button>
      )}

      {open && (
        <div
          className="gl col"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            width: 250,
            maxHeight: 268,
            overflowY: "auto",
            padding: 8,
            gap: 6,
            background: "var(--bg-2)",
            boxShadow: "0 16px 44px rgba(0,0,0,.45)",
          }}
          role="listbox"
        >
          <input
            ref={inputRef}
            className="input"
            placeholder="a word, or paste an emoji…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ padding: "6px 10px" }}
          />
          {rows.length === 0 && (
            <span className="mono-note" style={{ padding: "6px 4px" }}>
              nothing matches — the list lives in lib/emoji.ts
            </span>
          )}
          {rows.map((o, i) => (
            <button
              key={o.char}
              type="button"
              role="option"
              aria-selected={o.char === value}
              className={`search-hit${i === focus ? " is-focused" : ""}`}
              style={{
                all: "unset",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                padding: "5px 8px",
                borderRadius: 8,
                background: i === focus ? "rgba(255,255,255,.06)" : undefined,
                outline: i === focus ? "1px solid rgba(255,217,168,.5)" : undefined,
              }}
              onMouseEnter={() => setFocus(i)}
              onClick={() => pick(o.char)}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{o.char}</span>
              <span className="mono-note" style={{ fontSize: 11.5 }}>{o.label}</span>
              {o.char === value && (
                <span style={{ marginLeft: "auto", color: "var(--amber)", fontSize: 11 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
