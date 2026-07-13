/**
 * Intro block shown atop the catalog (landing) — a lightweight welcome for
 * first-time visitors that does NOT get in a returning user's way (no extra
 * page / click). Content is static; links point at the repo's guideline docs.
 */
export default function Intro() {
  return (
    <section className="intro" aria-label="關於 LoomHub-de">
      <h1 className="intro-title">LoomHub-de</h1>
      <p className="intro-tagline">
        DE 團隊的 AI Agent 資產中心 —— 分享、蒐集、整理可被 agent
        直接使用的 skill、prompt、MCP server 與 workflow。
      </p>
      <div className="intro-cards">
        <div className="intro-card">
          <span className="intro-card-num">1</span>
          <div>
            <b>找 &amp; 裝</b>
            <p>下方搜尋 / 篩選，點入看用法，複製安裝指令裝進你的 agent。</p>
          </div>
        </div>
        <div className="intro-card">
          <span className="intro-card-num">2</span>
          <div>
            <b>貢獻</b>
            <p>裝了 Loom，它會在你日常工作中主動幫你把成果變成合規 skill。</p>
          </div>
        </div>
        <div className="intro-card">
          <span className="intro-card-num">3</span>
          <div>
            <b>規範</b>
            <p>
              格式與貢獻流程見 repo 內的 <code>docs/03-spec.md</code> 與{" "}
              <code>AGENTS.md</code>。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
