import {
  Car,
  ChatCircleText,
  SquaresFour,
} from "@phosphor-icons/react";
import type { NavItem, NavView } from "./adminTypes";

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Գլխավոր", path: "/admin", icon: SquaresFour },
  { id: "requests", label: "Հարցումներ", path: "/admin/requests", icon: ChatCircleText },
  { id: "vehicles", label: "Մեքենաներ", path: "/admin/vehicles", icon: Car },
];

export function routeFromPath(pathname = window.location.pathname): NavView {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return navItems.some((item) => item.id === segment) ? segment as NavView : "dashboard";
}
