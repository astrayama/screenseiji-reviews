"use client";

import { useState } from "react";

/* Blurred until clicked — "click to unveil". */
export function SpoilerZone({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`spoiler${open ? " is-open" : ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "30px 0 22px",
          textAlign: "center",
        }}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2.5" />
          <path d={open ? "M8 11V8a4 4 0 0 1 7.5-2" : "M8 11V8a4 4 0 0 1 8 0v3"} />
        </svg>
        <span style={{ font: "600 17px var(--sans)", color: "var(--bright)" }}>Spoiler zone</span>
        <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
          {open ? "click to veil again" : "blurred — click to unveil"}
        </span>
        <span className={open ? "btn" : "btn btn--amber"} style={{ marginTop: 8, pointerEvents: "none" }}>
          {open ? "Hide spoilers" : "Reveal spoilers"}
        </span>
      </button>
      <div
        className="spoiler-body prose"
        style={{ padding: "0 30px 28px" }}
        aria-hidden={!open}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
