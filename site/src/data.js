import { useEffect, useState } from "react";

// Whitelists mirror Spec §4.1 / §4.2 (and schema/skill.schema.json). Kept here
// so filters always show the full, ordered value set even if some values have
// zero skills yet.
export const TYPE_WHITELIST = ["skill", "prompt", "mcp-server", "workflow", "kb-template"];
export const CATEGORY_WHITELIST = [
  "requirements",
  "design",
  "development",
  "testing",
  "ops",
  "docs",
  "research",
  "general",
];

// BASE_URL respects vite `base` (currently "/LoomHub-de/") so fetches resolve
// under the deploy subpath.
const base = import.meta.env.BASE_URL;

/** Load the catalog index (list) + skill bodies (detail) once. */
export function useCatalog() {
  const [state, setState] = useState({ loading: true, error: null, index: [], bodies: {} });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${base}index.json`).then((r) => {
        if (!r.ok) throw new Error(`index.json ${r.status}`);
        return r.json();
      }),
      // skills.json may be absent in odd setups; treat as non-fatal.
      fetch(`${base}skills.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ])
      .then(([index, bodies]) => {
        if (!cancelled) setState({ loading: false, error: null, index, bodies });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, index: [], bodies: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
