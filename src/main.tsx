import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { resolveAppRoute } from "./app/routes";
import { initializeTheme, useTheme } from "./frontend/theme/theme";
import "./styles.css";

initializeTheme();

const appRoute = resolveAppRoute(window.location.pathname);
const RootApp = appRoute === "admin"
  ? lazy(() => import("./frontend/admin/AdminApp").then((module) => ({ default: module.AdminApp })))
  : appRoute === "catalog"
    ? lazy(() => import("./frontend/public/CatalogApp").then((module) => ({ default: module.CatalogApp })))
    : appRoute === "vehicle"
      ? lazy(() => import("./frontend/public/vehicles/VehicleDetailsApp").then((module) => ({ default: module.VehicleDetailsApp })))
      : lazy(() => import("./frontend/public/HomeApp").then((module) => ({ default: module.HomeApp })));

document.title = appRoute === "admin"
  ? "Hovex Admin"
  : appRoute === "catalog"
    ? "Մեքենաների կատալոգ | Hovex Motors"
    : appRoute === "vehicle"
      ? "Մեքենայի մանրամասներ | Hovex Motors"
      : "Hovex Motors — մեքենաների ընտրություն և ներմուծում";

const root = document.getElementById("root");

if (!root) throw new Error("Hovex root element was not found");

function AppLoadingFallback() {
  const theme = useTheme();
  const darkModeEnabled = theme === "dark";

  return (
    <div
      role="status"
      data-loading-theme={theme}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: darkModeEnabled ? "#11110f" : "#faf8f4",
        color: darkModeEnabled ? "#f7f3eb" : "#11110f",
        colorScheme: theme,
        fontWeight: 700,
      }}
    >
      Բեռնվում է…
    </div>
  );
}

createRoot(root).render(
  <React.StrictMode>
    <Suspense fallback={<AppLoadingFallback />}>
      <RootApp />
    </Suspense>
  </React.StrictMode>,
);
