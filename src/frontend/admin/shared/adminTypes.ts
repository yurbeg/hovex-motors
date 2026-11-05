import type { Icon } from "@phosphor-icons/react";

export type NavView = "dashboard" | "requests" | "vehicles";
export type StatusTone = "blue" | "yellow" | "green" | "gray" | "orange";
export type StatTone = "ink" | "blue" | "yellow" | "orange";
export type FilterStatus<T extends string> = T | "all";
export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface StatusConfig {
  label: string;
  tone: StatusTone;
}

export interface NavItem {
  id: NavView;
  label: string;
  path: string;
  icon: Icon;
}
