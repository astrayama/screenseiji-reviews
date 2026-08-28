import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ViewTracker } from "@/components/ViewTracker";
import { getSiteConfig } from "@/lib/queries";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  let tagline = "one critic, every screen";
  let description = "Film and series reviews from a single voice. No algorithms, one sage.";
  try {
    const cfg = await getSiteConfig();
    if (cfg.tagline) {
      tagline = cfg.tagline;
      description = cfg.tagline;
    }
  } catch {
    /* metadata must never take the site down */
  }
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `Screen Sage — ${tagline}`,
      template: "%s · Screen Sage",
    },
    description,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cormorant.variable}>
        <ViewTracker />
        <SiteHeader />
        <main>{children}</main>
        <footer
          className="wrap"
          style={{ padding: "50px 20px 40px", marginTop: 60 }}
        >
          <hr className="hr" />
          <div className="row between" style={{ paddingTop: 22, flexWrap: "wrap", gap: 14 }}>
            <span className="logo" style={{ fontSize: 14 }}>SCREEN SAGE</span>
            <nav className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Link className="chip" href="/archive">Archive</Link>
              <Link className="chip" href="/lists">Lists</Link>
              <Link className="chip" href="/about">About</Link>
              <a className="chip" href="/feed.xml">RSS</a>
            </nav>
            <span className="mono-note" style={{ color: "var(--ghost)" }}>
              no algorithms, one voice
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
