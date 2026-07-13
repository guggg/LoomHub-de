import { TYPE_WHITELIST, CATEGORY_WHITELIST } from "../data.js";

/**
 * Sidebar filters (Spec §7.2.1): type + category as multi-select checkboxes
 * from the whitelists, tags as a multi-select chip cloud derived from data.
 * `counts` gives hit counts per value (computed on the search-filtered set).
 */
export default function Sidebar({
  allTags,
  selected,
  toggle,
  counts,
  onClear,
  hasFilters,
}) {
  const CheckList = ({ title, values, group }) => (
    <div className="filter-group">
      <h3>{title}</h3>
      {values.map((v) => (
        <label key={v} className="filter-item">
          <input
            type="checkbox"
            checked={selected[group].includes(v)}
            onChange={() => toggle(group, v)}
          />
          <span>{v}</span>
          <span className="filter-count">{counts[group][v] || 0}</span>
        </label>
      ))}
    </div>
  );

  return (
    <aside className="sidebar">
      {hasFilters && (
        <button className="clear-filters" onClick={onClear}>
          清除篩選
        </button>
      )}
      <CheckList title="Type" values={TYPE_WHITELIST} group="type" />
      <CheckList title="Category" values={CATEGORY_WHITELIST} group="category" />
      <div className="filter-group">
        <h3>Tags</h3>
        <div className="tag-cloud">
          {allTags.map((t) => (
            <button
              key={t}
              className={`tag-chip ${selected.tags.includes(t) ? "active" : ""}`}
              onClick={() => toggle("tags", t)}
            >
              #{t} {counts.tags[t] ? <span>({counts.tags[t]})</span> : null}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
