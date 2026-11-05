export type AppRoute = "home" | "catalog" | "admin";

const adminPathPattern = /^\/admin(?:\/|$)/;
const catalogPathPattern = /^\/catalog(?:\/|$)/;

export function resolveAppRoute(pathname: string): AppRoute {
  if (adminPathPattern.test(pathname)) return "admin";
  if (catalogPathPattern.test(pathname)) return "catalog";
  return "home";
}
