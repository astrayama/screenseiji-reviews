"use client";

import { useState } from "react";

/* Blurred until clicked — "click to unveil". */
export function SpoilerZone({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`spoiler${open ? " is-open" : ""}`} style={{ marginTop: 30 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          width: "100%",
          padding: "16px 0",
        }}
        aria-expanded={open}
      >
        <span style={{ font: "600 13px var(--mono)", letterSpacing: 3, color: "var(--bright)" }}>
          ⌁ SPOILER ZONE ⌁
        </span>
        <span style={{ font: "500 11px var(--mono)", color: "var(--dim)" }}>
          {open ? "click to veil again" : "blurred — click to unveil"}
        </span>
      </button>
      <div
        className="spoiler-body prose"
        style={{ padding: "0 22px 22px" }}
        aria-hidden={!open}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
