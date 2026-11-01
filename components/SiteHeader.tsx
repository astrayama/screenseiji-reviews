"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SearchOverlay } from "./SearchOverlay";

/* `match` is the path a link lights up on — the archive links share one URL,
   so they light up on the review pages of their kind instead */
const NAV = [
  { label: "Films", href: "/archive?type=film", match: "/films" },
  { label: "Series", href: "/archive?type=series", match: "/series" },
  { label: "Moods", href: "/moods", match: "/moods" },
  { label: "Lists", href: "/lists", match: "/lists" },
  { label: "About", href: "/about", match: "/about" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="wrap row between">
        <Link href="/" className="logo" aria-label="Screen Sage — home">
          SCREEN SAGE
        </Link>
        <div className="row" style={{ gap: 28 }}>
          <nav className={`site-nav${menuOpen ? " is-open" : ""}`}>
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className={pathname.startsWith(n.match) ? "is-active" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="search-text">Find a story</span>
          </button>
          <button
            className="chip nav-toggle"
            style={{ cursor: "pointer" }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
        </div>
      </div>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
