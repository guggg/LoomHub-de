import { Link } from "react-router-dom";

/**
 * LOGO SLOT (Spec §7.4). MVP renders a neutral placeholder tile. To use the
 * real brand logo later, replace the tile below with e.g.
 *   <img src={logoUrl} alt="skillsHub-de" className="logo-slot-img" />
 * and adjust the --logo-* tokens in theme.css. Do NOT change other structure.
 */
function Logo() {
  return <div className="logo-slot" aria-hidden="true">sH</div>;
}

export default function Header({ search, onSearch, theme, onToggleTheme }) {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <Logo />
        <span className="site-title">skillsHub-de</span>
      </Link>
      {onSearch && (
        <div className="header-search">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜尋 skill（名稱 / 描述 / 標籤）…"
            aria-label="搜尋"
          />
        </div>
      )}
      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        title="切換深淺色"
        style={onSearch ? undefined : { marginLeft: "auto" }}
      >
        {theme === "dark" ? "☀ Light" : "☾ Dark"}
      </button>
    </header>
  );
}
