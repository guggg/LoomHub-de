import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCatalog } from "../data.js";
import { useTheme } from "../useTheme.js";
import Header from "../components/Header.jsx";
import { DemoTerminal, DemoConversation } from "../components/DemoBlocks.jsx";
import {
  splitInstall,
  toParts,
  parseInstall,
  installIntro,
} from "../markdown.js";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for insecure/offline contexts without clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={onCopy}>
      {copied ? "已複製 ✓" : "複製"}
    </button>
  );
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
    const url = URL.createObjectURL(new Blob([raw], { type: "text/markdown" }));
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
            <div className="detail-header">
              <h1>{skill.name}</h1>
              <p className="detail-desc">{skill.description}</p>
              <div className="badge-row">
                <span className="badge type">{skill.type}</span>
                <span className="badge category">{skill.category}</span>
                {skill.tags?.map((t) => (
                  <span key={t} className="card-tag">#{t}</span>
                ))}
              </div>
              <div className="detail-meta">
                <span><b>版本</b> v{skill.version}</span>
                <span><b>維護</b> {skill.owner}</span>
                <span><b>更新</b> {skill.updated}</span>
                <span><b>路徑</b> {skill.path}</span>
                {rawUrl && (
                  <span>
                    <a href={rawUrl} target="_blank" rel="noreferrer">
                      檢視原始 SKILL.md
                    </a>
                  </span>
                )}
              </div>
            </div>

            {/* Rendered body (§7.2.2): markdown + demo blocks */}
            <div className="md-body">
              {bodyParts.map((part, i) => {
                if (part.type === "terminal")
                  return <DemoTerminal key={i} text={part.text} />;
                if (part.type === "conversation")
                  return <DemoConversation key={i} text={part.text} />;
                return (
                  <div key={i} dangerouslySetInnerHTML={{ __html: part.html }} />
                );
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
          </>
        )}
      </div>
    </>
  );
}
