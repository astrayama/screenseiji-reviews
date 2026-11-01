import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ViewTracker } from "@/components/ViewTracker";
import { getSiteConfig } from "@/lib/queries";
import "./globals.css";

/* Nunito for headings, the wordmark and pull quotes; Inter for everything you read */
const nunito = Nunito({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-nunito",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
      <body>
        <ViewTracker />
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap row between" style={{ flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
            <div className="col" style={{ gap: 12 }}>
              <span className="logo">SCREEN SAGE</span>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>no algorithms, one voice</span>
            </div>
            <nav className="footer-links">
              <Link href="/archive">Archive</Link>
              <Link href="/lists">Lists</Link>
              <Link href="/about">About</Link>
              <a href="/feed.xml">RSS</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
