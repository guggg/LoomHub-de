import { Link } from "react-router-dom";

/**
 * LOGO SLOT (Spec §7.4). Renders the brand logo from site/public/logo.png.
 * To change the logo, replace site/public/logo.png (same path) — no code
 * change needed. Sizing/shape is controlled by .logo-slot-img in app.css and
 * the --logo-* tokens in theme.css. Do NOT change other structure.
 */
function Logo() {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="skillsHub-de"
      className="logo-slot-img"
    />
  );
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
