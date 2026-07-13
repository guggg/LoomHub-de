import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
// Import only the common language subset (~35 langs) instead of all ~190 —
// keeps the bundle small while covering SQL/bash/json/etc. used in demos.
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

// Configure marked ONCE. marked-highlight handles code fences whose language
// is NOT one of our demo conventions — those become normal highlighted code
// blocks (Spec §3.2.1: "unknown fence -> normal code block, must not break").
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {
          /* fall through */
        }
      }
      return hljs.highlightAuto(code).value;
    },
  })
);
marked.setOptions({ gfm: true, breaks: false });

const INSTALL_HEADING_RE = /^#{1,6}\s*安裝\s*\/\s*Install\s*$/m;
// Matches a demo fence and captures its kind + inner text.
const DEMO_FENCE_RE = /```(demo-terminal|demo-conversation)[^\n]*\n([\s\S]*?)```/g;

/**
 * Split the SKILL.md body into { before, install } where `install` is the raw
 * markdown of the Install section (heading + rest) and `before` is everything
 * prior. Install is rendered specially (per-vendor copy buttons), the rest as
 * normal body. If there's no Install heading, install is "".
 */
export function splitInstall(body) {
  const m = body.match(INSTALL_HEADING_RE);
  if (!m) return { before: body, install: "" };
  const idx = m.index;
  return { before: body.slice(0, idx), install: body.slice(idx) };
}

/**
 * Turn a markdown string into an ordered list of parts so React can render
 * demo blocks as components while everything else goes through marked.
 * Returns: [{ type: "markdown", html }, { type: "terminal"|"conversation", text }]
 */
export function toParts(md) {
  const parts = [];
  let last = 0;
  let match;
  DEMO_FENCE_RE.lastIndex = 0;
  while ((match = DEMO_FENCE_RE.exec(md)) !== null) {
    if (match.index > last) {
      const chunk = md.slice(last, match.index);
      if (chunk.trim()) parts.push({ type: "markdown", html: marked.parse(chunk) });
    }
    parts.push({
      type: match[1] === "demo-terminal" ? "terminal" : "conversation",
      text: match[2].replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
  }
  if (last < md.length) {
    const tail = md.slice(last);
    if (tail.trim()) parts.push({ type: "markdown", html: marked.parse(tail) });
  }
  return parts;
}

/**
 * Parse an Install section into per-vendor command groups. The convention (see
 * every skill's Install block, Spec §6) is a single ```demo-terminal fence with
 * `#`-comment headers introducing each target and `$`-prefixed command lines.
 * Returns [{ label, commands: string[] }]. Falls back to [] if no fence found.
 */
export function parseInstall(install) {
  if (!install) return [];
  DEMO_FENCE_RE.lastIndex = 0;
  const m = DEMO_FENCE_RE.exec(install);
  if (!m) return [];
  const lines = m[2].split("\n");
  const groups = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.trim().startsWith("#")) {
      current = { label: line.trim().replace(/^#\s*/, ""), commands: [] };
      groups.push(current);
    } else if (line.trim().startsWith("$")) {
      const cmd = line.trim().replace(/^\$\s*/, "");
      if (!current) {
        current = { label: "指令 / Commands", commands: [] };
        groups.push(current);
      }
      current.commands.push(cmd);
    }
  }
  return groups.filter((g) => g.commands.length);
}

/** Any leading prose in the Install section, before the fenced command block. */
export function installIntro(install) {
  if (!install) return "";
  const withoutHeading = install.replace(INSTALL_HEADING_RE, "").trimStart();
  DEMO_FENCE_RE.lastIndex = 0;
  const m = DEMO_FENCE_RE.exec(withoutHeading);
  const intro = m ? withoutHeading.slice(0, m.index) : withoutHeading;
  return intro.trim() ? marked.parse(intro) : "";
}
