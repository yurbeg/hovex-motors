import { useCallback, useEffect, useRef, useState } from "react";
import type { NavView } from "../shared/adminTypes";
import { navItems, routeFromPath } from "../shared/navigation";

export function useAdminNavigation(onNavigate: () => void) {
  const [view, setView] = useState<NavView>(routeFromPath);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  useEffect(() => {
    const onPopState = () => {
      setView(routeFromPath());
      onNavigateRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextView: NavView) => {
    const item = navItems.find((entry) => entry.id === nextView) || navItems[0];
    if (routeFromPath() !== item.id) window.history.pushState({}, "", item.path);
    setView(item.id);
    onNavigateRef.current();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { view, navigate };
}
