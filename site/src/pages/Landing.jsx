import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useCatalog } from "../data.js";
import { useTheme } from "../useTheme.js";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Card from "../components/Card.jsx";
import Intro from "../components/Intro.jsx";

const EMPTY = { type: [], category: [], tags: [] };

export default function Landing() {
  const { loading, error, index } = useCatalog();
  const [theme, toggleTheme] = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(EMPTY);

  // Fuse over name / description / tags (Spec §7.2.1).
  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: ["name", "description", "tags"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [index]
  );

  const allTags = useMemo(() => {
    const s = new Set();
    index.forEach((sk) => sk.tags?.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [index]);

  // 1) search first
  const searched = useMemo(() => {
    const q = search.trim();
    if (!q) return index;
    return fuse.search(q).map((r) => r.item);
  }, [search, index, fuse]);

  // 2) AND-combine active filters
  const matchesFilters = (sk) =>
    (!selected.type.length || selected.type.includes(sk.type)) &&
    (!selected.category.length || selected.category.includes(sk.category)) &&
    (!selected.tags.length || selected.tags.every((t) => sk.tags?.includes(t)));

  const results = useMemo(
    () => searched.filter(matchesFilters),
    [searched, selected]
  );

  // hit counts per value, computed on the search-filtered set (before facet
  // selection) so counts reflect what each value would yield.
  const counts = useMemo(() => {
    const c = { type: {}, category: {}, tags: {} };
    searched.forEach((sk) => {
      c.type[sk.type] = (c.type[sk.type] || 0) + 1;
      c.category[sk.category] = (c.category[sk.category] || 0) + 1;
      sk.tags?.forEach((t) => (c.tags[t] = (c.tags[t] || 0) + 1));
    });
    return c;
  }, [searched]);

  const toggle = (group, value) =>
    setSelected((prev) => {
      const list = prev[group];
      return {
        ...prev,
        [group]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });

  const hasFilters =
    selected.type.length || selected.category.length || selected.tags.length;

  return (
    <>
      <Header
        search={search}
        onSearch={setSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Intro />
      <div className="layout">
        <Sidebar
          allTags={allTags}
          selected={selected}
          toggle={toggle}
          counts={counts}
          onClear={() => setSelected(EMPTY)}
          hasFilters={!!hasFilters}
        />
        <main>
          {loading && <div className="status">載入中…</div>}
          {error && <div className="status">無法載入目錄：{error}</div>}
          {!loading && !error && (
            <>
              <div className="results-meta">
                {results.length} / {index.length} 個項目
              </div>
              {results.length === 0 ? (
                <div className="empty-state">
                  沒有符合的項目。試著調整搜尋關鍵字或清除篩選。
                </div>
              ) : (
                <div className="card-wall">
                  {results.map((sk) => (
                    <Card key={sk.name} skill={sk} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
