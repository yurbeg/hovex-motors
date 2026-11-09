export type AppRoute = "home" | "catalog" | "admin";

const adminPathPattern = /^\/admin(?:\/|$)/;
const catalogPathPattern = /^\/catalog(?:\/|$)/;

export function resolveAppRoute(pathname: string): AppRoute {
  if (adminPathPattern.test(pathname)) return "admin";
  if (catalogPathPattern.test(pathname)) return "catalog";
  return "home";
}

export function resolveCatalogLotId(pathname: string): string | null {
  const match = /^\/catalog\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]).trim();
    return id || null;
  } catch {
    return null;
  }
}
