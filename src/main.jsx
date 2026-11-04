import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const isAdminPath = /^\/admin(?:\/|$)/.test(window.location.pathname);
const RootApp = isAdminPath
  ? lazy(() => import("./AdminApp.jsx").then((module) => ({ default: module.AdminApp })))
  : lazy(() => import("./App.jsx").then((module) => ({ default: module.App })));

if (isAdminPath) document.title = "Hovex Admin";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8f4", fontWeight: 700 }}>Բեռնվում է…</div>}>
      <RootApp />
    </Suspense>
  </React.StrictMode>,
);
