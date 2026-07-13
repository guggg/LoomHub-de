import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./theme.css";
import "./app.css";
import Landing from "./pages/Landing.jsx";
import Detail from "./pages/Detail.jsx";

// HashRouter keeps the site static & offline-capable (Spec §7.2.2): routes live
// in the URL fragment, so no server rewrites are needed for /skill/<name>.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/skill/:name" element={<Detail />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
