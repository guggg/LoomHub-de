import { useEffect, useState } from "react";

/** Light/dark toggle. Writes data-theme on <html> (theme.css reads it, §7.4). */
export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("shd-theme") || "light"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("shd-theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}
