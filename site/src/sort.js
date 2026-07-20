import { TYPE_WHITELIST } from "./data.js";

// Result-list sort (applied as the LAST step: search -> filter -> sort).
// `updated` is a "YYYY-MM-DD" string; lexicographic comparison is already
// equivalent to chronological comparison for that format, so no Date
// parsing is needed here.
export const SORT_OPTIONS = [
  { value: "updated-desc", label: "更新時間：新 → 舊" },
  { value: "updated-asc", label: "更新時間：舊 → 新" },
  { value: "name-asc", label: "名稱：A → Z" },
  { value: "name-desc", label: "名稱：Z → A" },
  { value: "type", label: "類型分組" },
];

export const DEFAULT_SORT = "updated-desc";

function typeRank(type) {
  const i = TYPE_WHITELIST.indexOf(type);
  return i === -1 ? TYPE_WHITELIST.length : i;
}

// Missing `updated` sorts as oldest (not "equal to everything"), even though
// the schema currently guarantees the field on every catalog entry.
function updatedKey(sk) {
  return sk.updated || "0000-00-00";
}

/**
 * Returns a NEW sorted array (never mutates `list`) so it's safe to feed the
 * output of a useMemo chain (search -> filter) into this as the final step.
 */
export function sortSkills(list, sortBy) {
  const arr = [...list];
  switch (sortBy) {
    case "updated-asc":
      return arr.sort((a, b) => {
        const ka = updatedKey(a), kb = updatedKey(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    case "name-asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case "type":
      return arr.sort((a, b) => {
        const byType = typeRank(a.type) - typeRank(b.type);
        return byType !== 0 ? byType : a.name.localeCompare(b.name);
      });
    case "updated-desc":
    default:
      return arr.sort((a, b) => {
        const ka = updatedKey(a), kb = updatedKey(b);
        return ka < kb ? 1 : ka > kb ? -1 : 0;
      });
  }
}
