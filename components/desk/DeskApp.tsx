"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Library, DeskTag, Category } from "./api";
import { WritePanel } from "./WritePanel";
import { LibraryPanel } from "./LibraryPanel";
import { TagsPanel } from "./TagsPanel";
import { RailPanel } from "./RailPanel";
import { ListsPanel } from "./ListsPanel";
import { AudiencePanel } from "./AudiencePanel";
import { SettingsPanel } from "./SettingsPanel";

const TABS = ["Write", "Library", "Tags", "Rail", "Lists", "Audience", "Settings"] as const;
export type DeskTab = (typeof TABS)[number];

export function DeskApp() {
  const [tab, setTab] = useState<DeskTab>("Write");
  const [library, setLibrary] = useState<Library | null>(null);
  const [tags, setTags] = useState<DeskTag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [lib, tg, cat] = await Promise.all([
        api<Library>("/api/desk/titles"),
        api<{ tags: DeskTag[] }>("/api/desk/tags"),
        api<{ categories: Category[] }>("/api/desk/categories"),
      ]);
      setLibrary(lib);
      setTags(tg.tags);
      setCategories(cat.categories);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't load the desk");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, [reload]);

  const router = useRouter();
  async function logout() {
    await fetch("/api/desk/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="wrap col" style={{ gap: 18, maxWidth: 1100 }}>
      <div
        className="row between"
        style={{
          background: "rgba(255,217,168,.12)",
          border: "1px solid rgba(255,217,168,.4)",
          borderRadius: 10,
          padding: "9px 16px",
        }}
      >
        <span className="label label--amber" style={{ letterSpacing: 2 }}>▣ Sage Desk — private</span>
        <div className="row">
          <span className="mono-note" style={{ color: "#c9a88a", fontSize: 10 }}>password gate · noindex</span>
          <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={logout}>
            leave
          </button>
        </div>
      </div>

      <nav className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "chip chip--solid" : "chip"}
            style={{ cursor: "pointer", background: t === tab ? undefined : "none" }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {error && (
        <p className="mono-note" style={{ color: "var(--pink)" }}>
          {error} — <button className="chip" style={{ cursor: "pointer" }} onClick={reload}>retry</button>
        </p>
      )}

      {!library && !error && <p className="mono-note">loading the desk…</p>}

      {library && (
        <>
          {tab === "Write" && (
            <WritePanel library={library} tags={tags} categories={categories} onChanged={reload} />
          )}
          {tab === "Library" && <LibraryPanel library={library} onChanged={reload} />}
          {tab === "Tags" && <TagsPanel tags={tags} categories={categories} onChanged={reload} />}
          {tab === "Rail" && <RailPanel library={library} />}
          {tab === "Lists" && <ListsPanel library={library} />}
          {tab === "Audience" && <AudiencePanel />}
          {tab === "Settings" && <SettingsPanel />}
        </>
      )}
    </div>
  );
}
