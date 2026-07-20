import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCatalog, TYPE_EMOJI } from "../data.js";
import { useTheme } from "../useTheme.js";
import Header from "../components/Header.jsx";
import { DemoTerminal, DemoConversation } from "../components/DemoBlocks.jsx";
import {
  splitInstall,
  toParts,
  parseInstall,
  installIntro,
} from "../markdown.js";

// Copy text to clipboard, with a textarea fallback for insecure/offline
// contexts that lack the async clipboard API.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={onCopy}>
      {copied ? "已複製 ✓" : "複製"}
    </button>
  );
}

// Render a marked-generated HTML chunk and, after it mounts, attach a
// copy-to-clipboard button to every <pre> code block. marked output is injected
// via dangerouslySetInnerHTML, so we post-process the DOM with a ref + effect.
// Idempotent (guards against double-add on re-render) and cleans up on unmount.
function MarkdownPart({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const timers = [];
    const pres = root.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(":scope > .code-copy-btn")) return; // idempotent
      pre.classList.add("code-block");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn code-copy-btn";
      btn.textContent = "複製";
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        await copyText((code || pre).textContent);
        btn.textContent = "已複製 ✓";
        btn.classList.add("copied");
        const t = setTimeout(() => {
          btn.textContent = "複製";
          btn.classList.remove("copied");
        }, 1500);
        timers.push(t);
      });
      pre.appendChild(btn);
    });
    return () => {
      timers.forEach(clearTimeout);
      pres.forEach((pre) => {
        pre
          .querySelectorAll(":scope > .code-copy-btn")
          .forEach((b) => b.remove());
      });
    };
  }, [html]);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Detail() {
  const { name } = useParams();
  const { loading, error, index, bodies } = useCatalog();
  const [theme, toggleTheme] = useTheme();

  const skill = useMemo(
    () => index.find((s) => s.name === name),
    [index, name]
  );
  const body = bodies[name]?.body || "";
  // Full original SKILL.md (incl. frontmatter) for the raw-view link (§7.2.2).
  const raw = bodies[name]?.raw || "";

  const { before, install } = useMemo(() => splitInstall(body), [body]);
  const bodyParts = useMemo(() => toParts(before), [before]);
  const installGroups = useMemo(() => parseInstall(install), [install]);
  const installIntroHtml = useMemo(() => installIntro(install), [install]);

  // Build an offline-capable blob URL for the full raw SKILL.md, and revoke it
  // on change/unmount so viewing many skills doesn't leak object URLs.
  const [rawUrl, setRawUrl] = useState(null);
  useEffect(() => {
    if (!raw) {
      setRawUrl(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([raw], { type: "text/markdown;charset=utf-8" }));
    setRawUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [raw]);

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <div className="detail">
        <Link to="/" className="back-link">← 回目錄</Link>

        {loading && <div className="status">載入中…</div>}
        {error && <div className="status">無法載入：{error}</div>}
        {!loading && !error && !skill && (
          <div className="status">找不到 skill：{name}</div>
        )}

        {skill && (
          <>
            <div className="detail-layout">
              <div className="detail-main">
                <div className="detail-header">
                  <h1>{skill.name}</h1>
                  <p className="detail-desc">{skill.description}</p>
                  <div className="badge-row">
                    <span className="badge type">{TYPE_EMOJI[skill.type] ?? ""} {skill.type}</span>
                    <span className="badge category">{skill.category}</span>
                    {skill.tags?.map((t) => (
                      <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="card-tag">#{t}</Link>
                    ))}
                  </div>
                </div>

                {/* Rendered body (§7.2.2): markdown + demo blocks */}
                <div className="md-body">
                  {bodyParts.map((part, i) => {
                    if (part.type === "terminal")
                      return <DemoTerminal key={i} text={part.text} />;
                    if (part.type === "conversation")
                      return <DemoConversation key={i} text={part.text} />;
                    return <MarkdownPart key={i} html={part.html} />;
                  })}
                </div>

                {/* Install (§7.2.2): one-click copy per vendor */}
                {(installGroups.length > 0 || installIntroHtml) && (
                  <section>
                    <h2>安裝 / Install</h2>
                    {installIntroHtml && (
                      <div
                        className="md-body"
                        dangerouslySetInnerHTML={{ __html: installIntroHtml }}
                      />
                    )}
                    {installGroups.map((g, i) => (
                      <div key={i} className="install-block">
                        <div className="install-head">
                          <span>{g.label}</span>
                          <CopyButton text={g.commands.join("\n")} />
                        </div>
                        <pre className="install-cmd">{g.commands.join("\n")}</pre>
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <aside className="detail-sidebar">
                <div className="detail-meta">
                  <span><b>版本</b> v{skill.version}</span>
                  <span><b>維護</b> {skill.owner}</span>
                  <span><b>更新</b> {skill.updated}</span>
                  <span><b>路徑</b> {skill.path}</span>
                  {skill.source && (
                    <span>
                      <b>來源</b>{" "}
                      <a href={skill.source} target="_blank" rel="noreferrer">
                        原始出處
                      </a>
                    </span>
                  )}
                  {skill.license && (
                    <span><b>授權</b> {skill.license}</span>
                  )}
                  {rawUrl && (
                    <span>
                      <a href={rawUrl} target="_blank" rel="noreferrer">
                        檢視原始 SKILL.md
                      </a>
                    </span>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}
