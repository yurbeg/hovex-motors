import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { resolveAppRoute } from "./app/routes";
import "./styles.css";

const appRoute = resolveAppRoute(window.location.pathname);
const RootApp = appRoute === "admin"
  ? lazy(() => import("./frontend/admin/AdminApp").then((module) => ({ default: module.AdminApp })))
  : appRoute === "catalog"
    ? lazy(() => import("./frontend/public/CatalogApp").then((module) => ({ default: module.CatalogApp })))
    : lazy(() => import("./frontend/public/HomeApp").then((module) => ({ default: module.HomeApp })));

document.title = appRoute === "admin"
  ? "Hovex Admin"
  : appRoute === "catalog"
    ? "Մեքենաների կատալոգ | Hovex Motors"
    : "Hovex Motors — մեքենաների ընտրություն և ներմուծում";

const root = document.getElementById("root");

if (!root) throw new Error("Hovex root element was not found");

createRoot(root).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8f4", fontWeight: 700 }}>Բեռնվում է…</div>}>
      <RootApp />
    </Suspense>
  </React.StrictMode>,
);
