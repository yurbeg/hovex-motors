export type AppRoute = "home" | "vehicle" | "catalog" | "admin";

const adminPathPattern = /^\/admin(?:\/|$)/;
const catalogPathPattern = /^\/catalog(?:\/|$)/;
const vehiclePathPattern = /^\/vehicles(?:\/|$)/;

export function resolveAppRoute(pathname: string): AppRoute {
  if (adminPathPattern.test(pathname)) return "admin";
  if (catalogPathPattern.test(pathname)) return "catalog";
  if (vehiclePathPattern.test(pathname)) return "vehicle";
  return "home";
}

function decodedPathSegment(pattern: RegExp, pathname: string): string | null {
  const match = pattern.exec(pathname);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]).trim();
    return id || null;
  } catch {
    return null;
  }
}

export function resolveCatalogLotId(pathname: string): string | null {
  return decodedPathSegment(/^\/catalog\/([^/]+)\/?$/, pathname);
}

export function resolveVehicleId(pathname: string): string | null {
  return decodedPathSegment(/^\/vehicles\/([^/]+)\/?$/, pathname);
}

export function vehicleDetailsPath(vehicleId: string): string {
  return `/vehicles/${encodeURIComponent(vehicleId)}`;
}
