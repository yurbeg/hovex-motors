import { Moon, Sun } from "@phosphor-icons/react";
import { toggleTheme, useTheme } from "./theme";

export interface ThemeToggleProps {
  className?: string;
}

const baseClasses = "inline-grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition duration-150 hover:-translate-y-px hover:border-[var(--ink)]";

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useTheme();
  const darkModeEnabled = theme === "dark";
  const label = darkModeEnabled
    ? "Միացնել բաց թեման"
    : "Միացնել մուգ թեման";

  return (
    <button
      className={`${baseClasses}${className ? ` ${className}` : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={darkModeEnabled}
      title={label}
      data-theme-toggle
      onClick={toggleTheme}
    >
      {darkModeEnabled
        ? <Sun size={21} weight="bold" aria-hidden="true" data-theme-icon="sun" />
        : <Moon size={21} weight="bold" aria-hidden="true" data-theme-icon="moon" />}
    </button>
  );
}
