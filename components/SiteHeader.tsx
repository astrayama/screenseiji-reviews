"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchOverlay } from "./SearchOverlay";

const NAV = [
  { label: "FILMS", href: "/archive?type=film" },
  { label: "SERIES", href: "/archive?type=series" },
  { label: "MOODS", href: "/moods" },
  { label: "LISTS", href: "/lists" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className="wrap row between"
      style={{ paddingTop: 26, paddingBottom: 22, position: "relative" }}
    >
      <Link href="/" className="logo" aria-label="Screen Sage — home">
        SCREEN SAGE
      </Link>
      <div className="row" style={{ gap: 14 }}>
        <nav className={`site-nav${menuOpen ? " is-open" : ""}`}>
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} onClick={() => setMenuOpen(false)}>
              {n.label}
            </Link>
          ))}
          <Link href="/about" onClick={() => setMenuOpen(false)}>
            ABOUT
          </Link>
        </nav>
        <button
          className="chip"
          style={{ cursor: "pointer", color: "var(--amber)", borderColor: "var(--border)", background: "none" }}
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          ⌕
        </button>
        <button
          className="chip nav-toggle"
          style={{ cursor: "pointer", background: "none" }}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </div>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
